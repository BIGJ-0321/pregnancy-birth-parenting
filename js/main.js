import { auth, googleProvider } from "./firebase.js?v=10";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getUserHouseholdId,
  createHousehold,
  joinHousehold,
  saveHouseholdSetup,
  subscribeHousehold,
  toggleChecklistItem,
  addEvent,
  subscribeRecentEvents,
  getLatestChecklistActivity,
  saveTodayMood,
  subscribeTodayCheckin,
  addCustomTodo,
  subscribeCustomTodos,
  toggleCustomTodo,
  deleteCustomTodo,
  saveNextCheckup,
  saveProfile,
  setMemberRole,
} from "./household.js?v=10";
import { SITUATION_TAGS } from "./tags.js?v=10";
import { getPregnancyStatus, dueDateFromLMP, daysUntil, getTodayDateStr } from "./pregnancy.js?v=10";
import {
  getWeeklyInfo,
  getChecklistForWeek,
  getDadTip,
  getMomCaution,
  MEDICAL_DISCLAIMER,
  CHECKLIST_ITEMS,
} from "./weeklyContent.js?v=10";
import { SYMPTOMS } from "./symptomsContent.js?v=10";
import { CANIDO_ITEMS } from "./canidoContent.js?v=10";

// ---------- 공통: 로그인 / 가구 연결 / 온보딩 ----------

const authSectionEl = document.getElementById("auth-section");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const statusEl = document.getElementById("auth-status");
const appLogoutBtn = document.getElementById("app-logout-btn");

const appShell = document.getElementById("app-shell");
const pageHeaderEl = document.getElementById("page-header");

const onboardingWizardEl = document.getElementById("onboarding-wizard");

let currentHouseholdId = null;
let unsubscribeHousehold = null;

loginBtn.addEventListener("click", () => {
  signInWithPopup(auth, googleProvider).catch((err) => {
    statusEl.textContent = "로그인 실패: " + err.message;
  });
});

logoutBtn.addEventListener("click", () => {
  signOut(auth);
});

appLogoutBtn.addEventListener("click", () => {
  signOut(auth);
});

function currentUserName() {
  return auth.currentUser?.displayName || "배우자";
}

let recentEvents = [];
let unsubscribeEvents = null;
let todayCheckin = null;
let unsubscribeCheckin = null;
let customTodos = [];
let unsubscribeCustomTodos = null;

function watchHousehold(householdId) {
  if (unsubscribeHousehold) unsubscribeHousehold();
  if (unsubscribeEvents) unsubscribeEvents();
  if (unsubscribeCheckin) unsubscribeCheckin();
  if (unsubscribeCustomTodos) unsubscribeCustomTodos();

  let firstRender = true;
  unsubscribeHousehold = subscribeHousehold(householdId, (household) => {
    renderHousehold(household);
    if (firstRender) {
      setupSymptomsView(household.id);
      setupCanidoView();
      firstRender = false;
    }
  });

  unsubscribeEvents = subscribeRecentEvents(householdId, 20, (events) => {
    recentEvents = events;
    if (lastHousehold) {
      renderHome(lastHousehold);
      renderVisits();
    }
  });

  unsubscribeCheckin = subscribeTodayCheckin(householdId, getTodayDateStr(), (checkin) => {
    todayCheckin = checkin;
    if (lastHousehold) renderHome(lastHousehold);
  });

  unsubscribeCustomTodos = subscribeCustomTodos(householdId, (todos) => {
    customTodos = todos;
    renderCustomTodos();
  });
}

function renderHousehold(household) {
  const uid = auth.currentUser.uid;
  const myRole = household.roles?.[uid];

  if (household.dueDate && myRole) {
    // 셋업 다 끝났으면 온보딩 마법사는 접어두고 바로 앱 화면으로
    pageHeaderEl.hidden = true;
    authSectionEl.hidden = true;
    onboardingWizardEl.hidden = true;
    appShell.hidden = false;
    if (!roleInitialized) {
      roleInitialized = true;
      setRole(myRole);
    }
    renderHome(household);
    renderTodos(household);
    renderSettings(household);
  } else {
    pageHeaderEl.hidden = false;
    authSectionEl.hidden = false;
    appShell.hidden = true;
    onboardingWizardEl.hidden = false;

    if (!myRole) {
      // 초대 코드로 막 들어왔거나(예정일은 이미 있음), 예전 데이터라 역할만 없는 경우 - 역할만 물어보고 끝
      startWizard("roleOnly", household.id);
    } else {
      // 역할은 있는데 예정일이 없는 드문 경우 (예정일 저장 도중 새로고침 등) - 예정일 단계부터 다시
      wizardHouseholdId = household.id;
      wizardRole = myRole;
      wizardMode = "fresh";
      goToStep("due");
    }
  }
}

// ---------- 온보딩 마법사 ----------

const wizardSteps = {
  role: document.getElementById("step-role"),
  connect: document.getElementById("step-connect"),
  due: document.getElementById("step-due"),
  invite: document.getElementById("step-invite"),
};

const hasCodeBtn = document.getElementById("has-code-btn");
const noCodeBtn = document.getElementById("no-code-btn");
const joinCodeArea = document.getElementById("join-code-area");
const wizardInviteCodeInput = document.getElementById("wizard-invite-code-input");
const wizardJoinBtn = document.getElementById("wizard-join-btn");
const wizardConnectErrorEl = document.getElementById("wizard-connect-error");

const wizardDueModeRadios = document.querySelectorAll('input[name="wizard-due-mode"]');
const wizardHospitalField = document.getElementById("wizard-hospital-field");
const wizardRefDateInput = document.getElementById("wizard-ref-date-input");
const wizardRefWeekInput = document.getElementById("wizard-ref-week-input");
const wizardRefDayInput = document.getElementById("wizard-ref-day-input");
const wizardHospitalDueDateInput = document.getElementById("wizard-hospital-due-date-input");
const wizardLmpField = document.getElementById("wizard-lmp-field");
const wizardLmpInput = document.getElementById("wizard-lmp-input");
const wizardTagsListEl = document.getElementById("wizard-tags-list");
const wizardDueNextBtn = document.getElementById("wizard-due-next-btn");
const wizardDueErrorEl = document.getElementById("wizard-due-error");

const inviteNowBtn = document.getElementById("invite-now-btn");
const inviteLaterBtn = document.getElementById("invite-later-btn");
const inviteCodeArea = document.getElementById("invite-code-area");
const wizardInviteCodeDisplayEl = document.getElementById("wizard-invite-code-display");
const wizardFinishBtn = document.getElementById("wizard-finish-btn");

let wizardMode = null; // "fresh" | "roleOnly"
let wizardHouseholdId = null;
let wizardRole = null;
let wizardInviteCode = null;

renderWizardTagChips();

function startWizard(mode, householdId) {
  wizardMode = mode;
  wizardHouseholdId = householdId;
  wizardRole = null;
  goToStep("role");
}

function goToStep(name) {
  for (const [key, el] of Object.entries(wizardSteps)) {
    el.hidden = key !== name;
  }
}

function renderWizardTagChips() {
  wizardTagsListEl.innerHTML = "";
  for (const tag of SITUATION_TAGS) {
    const label = document.createElement("label");
    label.className = "tag-chip";
    label.innerHTML = `<input type="checkbox" value="${tag.id}" /> ${tag.label}`;
    const checkbox = label.querySelector("input");
    checkbox.addEventListener("change", () => {
      label.classList.toggle("checked", checkbox.checked);
    });
    wizardTagsListEl.appendChild(label);
  }
}

// 1단계: 역할
document.querySelectorAll("#step-role .choice-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    wizardRole = btn.dataset.role;
    document.querySelectorAll("#step-role .choice-btn").forEach((b) => {
      b.classList.toggle("selected", b === btn);
    });

    if (wizardMode === "roleOnly") {
      try {
        await setMemberRole(wizardHouseholdId, auth.currentUser.uid, wizardRole);
        // household 구독이 바로 다시 렌더링하면서 앱 화면으로 넘어감
      } catch (err) {
        alert("저장 실패: " + err.message);
      }
    } else {
      goToStep("connect");
    }
  });
});

// 2단계: 배우자 연결 확인
hasCodeBtn.addEventListener("click", () => {
  joinCodeArea.hidden = false;
});

noCodeBtn.addEventListener("click", () => {
  goToStep("due");
});

wizardJoinBtn.addEventListener("click", async () => {
  const code = wizardInviteCodeInput.value;
  if (!code) return;
  wizardJoinBtn.disabled = true;
  try {
    const uid = auth.currentUser.uid;
    const householdId = await joinHousehold(uid, code);
    await setMemberRole(householdId, uid, wizardRole);
    currentHouseholdId = householdId;
    watchHousehold(householdId);
  } catch (err) {
    wizardConnectErrorEl.textContent = err.message;
    wizardConnectErrorEl.hidden = false;
  } finally {
    wizardJoinBtn.disabled = false;
  }
});

// 3단계: 출산 예정일
for (const radio of wizardDueModeRadios) {
  radio.addEventListener("change", () => {
    const mode = document.querySelector('input[name="wizard-due-mode"]:checked').value;
    wizardHospitalField.hidden = mode !== "hospital";
    wizardLmpField.hidden = mode !== "lmp";
  });
}

wizardDueNextBtn.addEventListener("click", async () => {
  const mode = document.querySelector('input[name="wizard-due-mode"]:checked').value;
  let dueDate;
  let pregnancyReference = null;

  if (mode === "hospital") {
    const week = Number(wizardRefWeekInput.value);
    const day = Number(wizardRefDayInput.value);
    if (!wizardRefDateInput.value) {
      showWizardDueError("병원에서 정보를 알려준 날짜를 입력해줘.");
      return;
    }
    if (!week || week < 1 || week > 42) {
      showWizardDueError("임신 주수를 1~42 사이로 입력해줘.");
      return;
    }
    if (wizardRefDayInput.value === "" || day < 0 || day > 6) {
      showWizardDueError("일수를 0~6 사이로 입력해줘.");
      return;
    }
    if (!wizardHospitalDueDateInput.value) {
      showWizardDueError("출산 예정일을 입력해줘.");
      return;
    }
    dueDate = wizardHospitalDueDateInput.value;
    pregnancyReference = { date: wizardRefDateInput.value, week, day };
  } else {
    if (!wizardLmpInput.value) {
      showWizardDueError("마지막 생리 시작일을 입력해줘.");
      return;
    }
    dueDate = dueDateFromLMP(wizardLmpInput.value);
  }

  const selectedTags = Array.from(
    wizardTagsListEl.querySelectorAll("input[type=checkbox]:checked")
  ).map((el) => el.value);

  wizardDueNextBtn.disabled = true;
  try {
    const uid = auth.currentUser.uid;
    if (!wizardHouseholdId) {
      const { householdId, inviteCode } = await createHousehold(uid);
      wizardHouseholdId = householdId;
      wizardInviteCode = inviteCode;
    }
    await setMemberRole(wizardHouseholdId, uid, wizardRole);
    await saveHouseholdSetup(wizardHouseholdId, { dueDate, tags: selectedTags, pregnancyReference });
    goToStep("invite");
  } catch (err) {
    showWizardDueError(err.message);
  } finally {
    wizardDueNextBtn.disabled = false;
  }
});

function showWizardDueError(message) {
  wizardDueErrorEl.textContent = message;
  wizardDueErrorEl.hidden = false;
}

// 4단계: 배우자 초대
inviteNowBtn.addEventListener("click", () => {
  inviteNowBtn.classList.add("selected");
  inviteLaterBtn.classList.remove("selected");
  inviteCodeArea.hidden = false;
  wizardInviteCodeDisplayEl.textContent = wizardInviteCode;
});

inviteLaterBtn.addEventListener("click", () => {
  finishWizard();
});

wizardFinishBtn.addEventListener("click", () => {
  finishWizard();
});

function finishWizard() {
  currentHouseholdId = wizardHouseholdId;
  watchHousehold(wizardHouseholdId);
}

// ---------- 탭 전환 ----------

const tabButtons = document.querySelectorAll(".tab-btn");
const views = {
  home: document.getElementById("view-home"),
  symptoms: document.getElementById("view-symptoms"),
  canido: document.getElementById("view-canido"),
  todos: document.getElementById("view-todos"),
  more: document.getElementById("view-more"),
};

function switchView(name) {
  for (const [key, el] of Object.entries(views)) {
    el.hidden = key !== name;
  }
  for (const btn of tabButtons) {
    btn.classList.toggle("active", btn.dataset.view === name);
  }
  window.scrollTo(0, 0);
}

for (const btn of tabButtons) {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
}

document.getElementById("todo-summary-link").addEventListener("click", (e) => {
  e.preventDefault();
  switchView("todos");
});

switchView("home");

// ---------- 홈 화면 ----------

const weekResultTitleEl = document.getElementById("week-result-title");
const weekDdayBadgeEl = document.getElementById("week-dday-badge");
const weekBabyInfoEl = document.getElementById("week-baby-info");
const partnerFeedEl = document.getElementById("partner-feed");
const roleMomBtn = document.getElementById("role-mom-btn");
const roleDadBtn = document.getElementById("role-dad-btn");
const roleCardMainTitleEl = document.getElementById("role-card-main-title");
const roleCardMainTextEl = document.getElementById("role-card-main-text");
const roleCardCautionTitleEl = document.getElementById("role-card-caution-title");
const roleCardCautionTextEl = document.getElementById("role-card-caution-text");
const checkupCardTextEl = document.getElementById("checkup-card-text");
const todoSummaryTextEl = document.getElementById("todo-summary-text");
const noteInput = document.getElementById("note-input");
const noteSubmitBtn = document.getElementById("note-submit-btn");
const recentEventsCard = document.getElementById("recent-events-card");
const recentEventsListEl = document.getElementById("recent-events-list");
const moodButtonsEl = document.getElementById("mood-buttons");
const moodReadonlyTextEl = document.getElementById("mood-readonly-text");
const MOOD_LABELS = { good: "😊 좋음", ok: "🙂 괜찮음", hard: "😵 힘듦", very_hard: "🤢 매우힘듦" };
const disclaimerEl = document.getElementById("disclaimer-text");
disclaimerEl.textContent = MEDICAL_DISCLAIMER;

let currentRole = "mom";
let roleInitialized = false;
let lastHousehold = null;

roleMomBtn.addEventListener("click", () => setRole("mom"));
roleDadBtn.addEventListener("click", () => setRole("dad"));

function setRole(role) {
  currentRole = role;
  roleMomBtn.classList.toggle("active", role === "mom");
  roleDadBtn.classList.toggle("active", role === "dad");
  document.body.dataset.role = role;
  if (lastHousehold) renderRoleCard(lastHousehold);
}

const roleToggleEl = document.querySelector(".role-toggle");
const roleCardMainEl = document.getElementById("role-card-main");
const roleCardCautionEl = document.getElementById("role-card-caution");
const checkupCardEl = document.getElementById("checkup-card");
const todoSummaryLinkEl = document.getElementById("todo-summary-link");

checkupCardEl.addEventListener("click", (e) => {
  e.preventDefault();
  switchView("todos");
});

noteSubmitBtn.addEventListener("click", async () => {
  const text = noteInput.value.trim();
  if (!text || !lastHousehold) return;
  noteSubmitBtn.disabled = true;
  try {
    await addEvent(lastHousehold.id, { type: "note", rawText: text, byName: currentUserName() });
    noteInput.value = "";
  } catch (err) {
    alert("저장 실패: " + err.message);
  } finally {
    noteSubmitBtn.disabled = false;
  }
});

moodButtonsEl.querySelectorAll(".mood-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    if (!lastHousehold) return;
    btn.disabled = true;
    try {
      await saveTodayMood(lastHousehold.id, getTodayDateStr(), btn.dataset.mood, currentUserName());
    } catch (err) {
      alert("저장 실패: " + err.message);
    } finally {
      btn.disabled = false;
    }
  });
});

function renderMoodCard(household) {
  const myRole = household.roles?.[auth.currentUser.uid];
  const isMom = myRole === "mom";

  setVisible(moodButtonsEl, isMom);
  moodReadonlyTextEl.hidden = isMom;

  if (isMom) {
    moodButtonsEl.querySelectorAll(".mood-btn").forEach((btn) => {
      btn.classList.toggle("selected", todayCheckin && btn.dataset.mood === todayCheckin.mood);
    });
  } else {
    moodReadonlyTextEl.textContent = todayCheckin
      ? `오늘 아내 컨디션: ${MOOD_LABELS[todayCheckin.mood]}`
      : "아직 오늘 컨디션을 기록하지 않았어요.";
  }
}

function formatRelativeTime(at) {
  const diffMs = Date.now() - at;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}일 전`;
}

const EVENT_PREFIX = { symptom: "🩺 ", visit: "🏥 " };

function renderEventList(listEl, events) {
  listEl.innerHTML = "";
  for (const event of events) {
    const li = document.createElement("li");

    const meta = document.createElement("span");
    meta.className = "event-meta";
    meta.textContent = `${formatRelativeTime(event.at)} · ${event.byName}`;
    li.appendChild(meta);
    li.appendChild(document.createElement("br"));

    li.appendChild(document.createTextNode((EVENT_PREFIX[event.type] || "") + event.rawText));

    listEl.appendChild(li);
  }
}

function renderRecentEvents() {
  const recent = recentEvents.slice(0, 5);
  recentEventsCard.hidden = recent.length === 0;
  renderEventList(recentEventsListEl, recent);
}

function renderVisits() {
  const visits = recentEvents.filter((e) => e.type === "visit");
  visitEmptyEl.hidden = visits.length > 0;
  renderEventList(visitListEl, visits);
}

// role-toggle/todo-summary-link/partner-feed는 CSS에서 display:flex를 고정으로 주기 때문에,
// hidden 속성 대신 style.display로 직접 토글해야 확실히 감춰짐
function setVisible(el, visible, displayValue = "flex") {
  el.style.display = visible ? displayValue : "none";
}

function renderHome(household) {
  lastHousehold = household;
  const { week, dayOfWeek, isBorn } = getPregnancyStatus(household.dueDate, household.pregnancyReference);

  if (isBorn) {
    weekResultTitleEl.textContent = "출산 예정일이 지났어요";
    weekDdayBadgeEl.textContent = "";
    weekBabyInfoEl.textContent = "혹시 출산했다면, 다음 업데이트에서 아기 개월수 모드로 전환하는 기능을 추가할게.";
    setVisible(partnerFeedEl, false);
    setVisible(roleToggleEl, false);
    roleCardMainEl.hidden = true;
    roleCardCautionEl.hidden = true;
    setVisible(checkupCardEl, false);
    setVisible(todoSummaryLinkEl, false);
    return;
  }

  setVisible(roleToggleEl, true);
  roleCardMainEl.hidden = false;
  roleCardCautionEl.hidden = false;
  setVisible(checkupCardEl, true);
  setVisible(todoSummaryLinkEl, true);

  const info = getWeeklyInfo(week);
  weekResultTitleEl.textContent = `임신 ${week}주 ${dayOfWeek}일차`;
  const dToDue = daysUntil(household.dueDate);
  weekDdayBadgeEl.textContent = dToDue >= 0 ? `예정일 D-${dToDue}` : `예정일 D+${-dToDue}`;
  weekBabyInfoEl.textContent = info.baby;

  const labels = {};
  for (const item of CHECKLIST_ITEMS) labels[item.id] = item.label;
  const checklistActivity = getLatestChecklistActivity(household, labels);
  const latestEvent = recentEvents[0]
    ? {
        text:
          recentEvents[0].type === "symptom"
            ? `'${recentEvents[0].rawText}' 증상을 기록했어요`
            : "메모를 남겼어요",
        byName: recentEvents[0].byName,
        at: recentEvents[0].at,
      }
    : null;
  const activity = [checklistActivity, latestEvent]
    .filter(Boolean)
    .sort((a, b) => b.at - a.at)[0];
  if (activity) {
    partnerFeedEl.textContent = `👋 ${activity.byName}님이 최근 ${activity.text}`;
    setVisible(partnerFeedEl, true);
  } else {
    setVisible(partnerFeedEl, false);
  }

  renderRecentEvents();
  renderMoodCard(household);
  renderRoleCard(household);
  renderCheckupCard(household);

  const items = getChecklistForWeek(week, household.tags || []);
  const state = household.checklistState || {};
  const remaining = items.filter((item) => !state[item.id]?.done);
  todoSummaryTextEl.textContent =
    remaining.length > 0
      ? `${remaining[0].label}${remaining.length > 1 ? ` 외 ${remaining.length - 1}건` : ""}`
      : "이번 주 할 일을 모두 끝냈어요";
}

function renderRoleCard(household) {
  const { week, isBorn } = getPregnancyStatus(household.dueDate, household.pregnancyReference);
  if (isBorn) return;
  if (currentRole === "mom") {
    roleCardMainTitleEl.textContent = "내 몸의 변화";
    roleCardMainTextEl.textContent = getWeeklyInfo(week).mom;
    roleCardCautionTitleEl.textContent = "오늘 조심할 것";
    roleCardCautionTextEl.textContent = getMomCaution(week);
  } else {
    roleCardMainTitleEl.textContent = "이번 주 아내 변화";
    roleCardMainTextEl.textContent = getWeeklyInfo(week).mom;
    roleCardCautionTitleEl.textContent = "오늘 도와줄 것";
    roleCardCautionTextEl.textContent = getDadTip(week);
  }
}

function renderCheckupCard(household) {
  if (!household.nextCheckupDate) {
    checkupCardTextEl.textContent = "검진일을 등록해줘 →";
    return;
  }
  const d = daysUntil(household.nextCheckupDate);
  const dateLabel = new Date(household.nextCheckupDate + "T00:00:00").toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const dDayLabel = d === 0 ? "D-day" : d > 0 ? `D-${d}` : "지남";
  checkupCardTextEl.textContent = `${dateLabel} · ${dDayLabel}`;
}

// ---------- 할일 · 검진 ----------

const todoListEl = document.getElementById("todo-list");
const todoEmptyEl = document.getElementById("todo-empty");
const checkupDateInput = document.getElementById("checkup-date-input");
const saveCheckupBtn = document.getElementById("save-checkup-btn");
const checkupSavedTextEl = document.getElementById("checkup-saved-text");
const visitListEl = document.getElementById("visit-list");
const visitEmptyEl = document.getElementById("visit-empty");
const visitInput = document.getElementById("visit-input");
const visitSubmitBtn = document.getElementById("visit-submit-btn");

visitSubmitBtn.addEventListener("click", async () => {
  const text = visitInput.value.trim();
  if (!text || !lastHousehold) return;
  visitSubmitBtn.disabled = true;
  try {
    await addEvent(lastHousehold.id, { type: "visit", rawText: text, byName: currentUserName() });
    visitInput.value = "";
  } catch (err) {
    alert("저장 실패: " + err.message);
  } finally {
    visitSubmitBtn.disabled = false;
  }
});
const ASSIGNEE_LABEL = { mom: "엄", dad: "아", both: "둘" };

saveCheckupBtn.addEventListener("click", async () => {
  if (!checkupDateInput.value || !lastHousehold) return;
  saveCheckupBtn.disabled = true;
  try {
    await saveNextCheckup(lastHousehold.id, checkupDateInput.value);
    checkupSavedTextEl.textContent = "저장됐어요.";
  } catch (err) {
    checkupSavedTextEl.textContent = "저장 실패: " + err.message;
  } finally {
    saveCheckupBtn.disabled = false;
  }
});

function renderTodos(household) {
  checkupDateInput.value = household.nextCheckupDate || "";
  checkupSavedTextEl.textContent = "";
  renderVisits();

  const { week, isBorn } = getPregnancyStatus(household.dueDate, household.pregnancyReference);
  if (isBorn) {
    todoListEl.innerHTML = "";
    todoEmptyEl.hidden = false;
    todoEmptyEl.textContent = "출산 이후 체크리스트는 다음 업데이트에서 추가할게.";
    return;
  }

  const items = getChecklistForWeek(week, household.tags || []);
  const state = household.checklistState || {};

  todoListEl.innerHTML = "";
  todoEmptyEl.hidden = items.length > 0;
  todoEmptyEl.textContent = "이번 주에 해당하는 항목이 없어요.";

  for (const item of items) {
    const entry = state[item.id];
    const checked = !!entry?.done;
    const li = document.createElement("li");
    li.className = checked ? "checked" : "";

    const checkboxId = `todo-${item.id}`;
    const assignee = item.assignee || "both";
    li.innerHTML = `
      <input type="checkbox" id="${checkboxId}" ${checked ? "checked" : ""} />
      <label for="${checkboxId}">${item.label}${item.required ? '<span class="required-badge">필수</span>' : ""}</label>
      <span class="assignee-badge ${assignee}">${ASSIGNEE_LABEL[assignee]}</span>
    `;

    const checkbox = li.querySelector("input");
    checkbox.addEventListener("change", async () => {
      li.classList.toggle("checked", checkbox.checked);
      try {
        await toggleChecklistItem(household.id, item.id, checkbox.checked, currentUserName());
      } catch (err) {
        checkbox.checked = !checkbox.checked;
        li.classList.toggle("checked", checkbox.checked);
        alert("저장 실패: " + err.message);
      }
    });

    todoListEl.appendChild(li);
  }
}

const customTodoListEl = document.getElementById("custom-todo-list");
const customTodoEmptyEl = document.getElementById("custom-todo-empty");
const customTodoInput = document.getElementById("custom-todo-input");
const customTodoAddBtn = document.getElementById("custom-todo-add-btn");
const customTodoAssigneeRow = document.getElementById("custom-todo-assignee-row");
const customTodoAddTrigger = document.getElementById("custom-todo-add-trigger");
const customTodoForm = document.getElementById("custom-todo-form");
let selectedAssignee = "both";

customTodoAddTrigger.addEventListener("click", () => {
  customTodoAddTrigger.hidden = true;
  customTodoForm.hidden = false;
  customTodoInput.focus();
});

function collapseCustomTodoForm() {
  customTodoForm.hidden = true;
  customTodoAddTrigger.hidden = false;
}

customTodoAssigneeRow.querySelectorAll(".assignee-choice").forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedAssignee = btn.dataset.assignee;
    customTodoAssigneeRow.querySelectorAll(".assignee-choice").forEach((b) => {
      b.classList.toggle("selected", b === btn);
    });
  });
});

customTodoAddBtn.addEventListener("click", async () => {
  const label = customTodoInput.value.trim();
  if (!label || !lastHousehold) return;
  customTodoAddBtn.disabled = true;
  try {
    await addCustomTodo(lastHousehold.id, { label, assignee: selectedAssignee, byName: currentUserName() });
    customTodoInput.value = "";
    collapseCustomTodoForm();
  } catch (err) {
    alert("저장 실패: " + err.message);
  } finally {
    customTodoAddBtn.disabled = false;
  }
});

function renderCustomTodos() {
  customTodoListEl.innerHTML = "";
  customTodoEmptyEl.hidden = customTodos.length > 0;

  for (const todo of customTodos) {
    const li = document.createElement("li");
    li.className = todo.done ? "checked" : "";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;

    const label = document.createElement("label");
    label.textContent = todo.label;
    label.style.cursor = "pointer";
    label.addEventListener("click", () => checkbox.click());

    const badge = document.createElement("span");
    badge.className = `assignee-badge ${todo.assignee}`;
    badge.textContent = ASSIGNEE_LABEL[todo.assignee] || "둘";

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "✕";
    deleteBtn.className = "text-link";
    deleteBtn.style.padding = "0 4px";
    deleteBtn.style.margin = "0";

    li.append(checkbox, label, badge, deleteBtn);

    checkbox.addEventListener("change", async () => {
      li.classList.toggle("checked", checkbox.checked);
      try {
        await toggleCustomTodo(lastHousehold.id, todo.id, checkbox.checked);
      } catch (err) {
        checkbox.checked = !checkbox.checked;
        li.classList.toggle("checked", checkbox.checked);
        alert("저장 실패: " + err.message);
      }
    });

    deleteBtn.addEventListener("click", async () => {
      try {
        await deleteCustomTodo(lastHousehold.id, todo.id);
      } catch (err) {
        alert("삭제 실패: " + err.message);
      }
    });

    customTodoListEl.appendChild(li);
  }
}

// ---------- 전체 (내 정보 / 로그아웃) ----------

const settingsRoleRow = document.getElementById("settings-role-row");
const spouseStatusTextEl = document.getElementById("spouse-status-text");
const spouseInviteCodeEl = document.getElementById("spouse-invite-code");

const settingsAgeInput = document.getElementById("settings-age-input");
const settingsHospitalField = document.getElementById("settings-hospital-field");
const settingsRefDateInput = document.getElementById("settings-ref-date-input");
const settingsRefWeekInput = document.getElementById("settings-ref-week-input");
const settingsRefDayInput = document.getElementById("settings-ref-day-input");
const settingsHospitalDueDateInput = document.getElementById("settings-hospital-due-date-input");
const settingsLmpField = document.getElementById("settings-lmp-field");
const settingsLmpInput = document.getElementById("settings-lmp-input");
const settingsDueModeRadios = document.querySelectorAll('input[name="settings-due-mode"]');
const saveSettingsBtn = document.getElementById("save-settings-btn");
const settingsSavedTextEl = document.getElementById("settings-saved-text");

for (const radio of settingsDueModeRadios) {
  radio.addEventListener("change", () => {
    const mode = document.querySelector('input[name="settings-due-mode"]:checked').value;
    settingsHospitalField.hidden = mode !== "hospital";
    settingsLmpField.hidden = mode !== "lmp";
  });
}

settingsRoleRow.querySelectorAll(".choice-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    if (!lastHousehold) return;
    try {
      await setMemberRole(lastHousehold.id, auth.currentUser.uid, btn.dataset.role);
    } catch (err) {
      alert("저장 실패: " + err.message);
    }
  });
});

function renderSettings(household) {
  const myRole = household.roles?.[auth.currentUser.uid];
  settingsRoleRow.querySelectorAll(".choice-btn").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.role === myRole);
  });

  if (household.members.length >= 2) {
    spouseStatusTextEl.textContent = "배우자와 연결됐어요.";
    spouseInviteCodeEl.hidden = true;
  } else {
    spouseStatusTextEl.textContent = "아직 배우자가 연결되지 않았어요. 이 코드를 알려주세요:";
    spouseInviteCodeEl.hidden = false;
    spouseInviteCodeEl.textContent = household.inviteCode;
  }

  settingsAgeInput.value = household.momAge || "";
  settingsHospitalDueDateInput.value = household.dueDate || "";
  if (household.pregnancyReference) {
    settingsRefDateInput.value = household.pregnancyReference.date || "";
    settingsRefWeekInput.value = household.pregnancyReference.week || "";
    settingsRefDayInput.value = household.pregnancyReference.day ?? "";
  }
  settingsSavedTextEl.textContent = "";
}

saveSettingsBtn.addEventListener("click", async () => {
  if (!lastHousehold) return;
  const mode = document.querySelector('input[name="settings-due-mode"]:checked').value;
  let dueDate;
  let pregnancyReference = null;

  if (mode === "hospital") {
    const week = Number(settingsRefWeekInput.value);
    const day = Number(settingsRefDayInput.value);
    if (!settingsRefDateInput.value) {
      settingsSavedTextEl.textContent = "병원에서 정보를 알려준 날짜를 입력해줘.";
      return;
    }
    if (!week || week < 1 || week > 42) {
      settingsSavedTextEl.textContent = "임신 주수를 1~42 사이로 입력해줘.";
      return;
    }
    if (settingsRefDayInput.value === "" || day < 0 || day > 6) {
      settingsSavedTextEl.textContent = "일수를 0~6 사이로 입력해줘.";
      return;
    }
    if (!settingsHospitalDueDateInput.value) {
      settingsSavedTextEl.textContent = "출산 예정일을 입력해줘.";
      return;
    }
    dueDate = settingsHospitalDueDateInput.value;
    pregnancyReference = { date: settingsRefDateInput.value, week, day };
  } else {
    if (!settingsLmpInput.value) {
      settingsSavedTextEl.textContent = "마지막 생리 시작일을 입력해줘.";
      return;
    }
    dueDate = dueDateFromLMP(settingsLmpInput.value);
  }

  const age = settingsAgeInput.value ? Number(settingsAgeInput.value) : null;

  saveSettingsBtn.disabled = true;
  try {
    await saveProfile(lastHousehold.id, { age, dueDate, pregnancyReference });
    settingsSavedTextEl.textContent = "저장됐어요.";
  } catch (err) {
    settingsSavedTextEl.textContent = "저장 실패: " + err.message;
  } finally {
    saveSettingsBtn.disabled = false;
  }
});

// ---------- 증상가이드 ----------

const symptomChipsEl = document.getElementById("symptom-chips");
const symptomDetailEl = document.getElementById("symptom-detail");
let symptomsViewReady = false;

function setupSymptomsView(householdId) {
  if (symptomsViewReady) return;
  symptomsViewReady = true;

  let activeChip = null;

  for (const name of Object.keys(SYMPTOMS)) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "tag-chip";
    chip.textContent = name;
    chip.addEventListener("click", () => {
      if (activeChip) activeChip.classList.remove("checked");
      chip.classList.add("checked");
      activeChip = chip;
      renderSymptomDetail(name, householdId);
    });
    symptomChipsEl.appendChild(chip);
  }

  const firstChip = symptomChipsEl.querySelector(".tag-chip");
  if (firstChip) firstChip.click();
}

function renderSymptomDetail(name, householdId) {
  const s = SYMPTOMS[name];
  symptomDetailEl.innerHTML = `
    <div class="symptom-tier">
      <div><div class="tier-title">흔히 있을 수 있어요</div>${s.common}</div>
    </div>
    <div class="symptom-tier">
      <div><div class="tier-title">이렇게 해보세요</div>${s.care}</div>
    </div>
    <div class="symptom-tier tier-warning">
      <div><div class="tier-title">병원에 문의하세요</div>${s.call}</div>
    </div>
    <div class="symptom-tier tier-danger">
      <div><div class="tier-title">바로 진료가 필요해요</div>${s.urgent}</div>
    </div>
    <div class="record-row" id="record-row">
      <input type="checkbox" id="record-cb" />
      <label for="record-cb">지금 증상 기록하기</label>
    </div>
  `;

  document.getElementById("record-cb").addEventListener("change", async (e) => {
    const row = document.getElementById("record-row");
    if (!e.target.checked) return;
    try {
      await addEvent(householdId, { type: "symptom", rawText: name, byName: currentUserName() });
      row.classList.add("done");
      row.querySelector("label").textContent = "기록됨 · 배우자에게 공유됨";
    } catch (err) {
      e.target.checked = false;
      alert("저장 실패: " + err.message);
    }
  });
}

// ---------- 이거 해도 돼 ----------

const canidoSearchEl = document.getElementById("canido-search");
const canidoResultEl = document.getElementById("canido-result");
const canidoChipsEl = document.getElementById("canido-chips");
let canidoViewReady = false;

function setupCanidoView() {
  if (canidoViewReady) return;
  canidoViewReady = true;

  for (const name of Object.keys(CANIDO_ITEMS)) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "tag-chip";
    chip.textContent = name;
    chip.addEventListener("click", () => {
      canidoSearchEl.value = name;
      renderCanidoResult(name);
    });
    canidoChipsEl.appendChild(chip);
  }

  canidoSearchEl.addEventListener("input", () => {
    const q = canidoSearchEl.value.trim();
    if (CANIDO_ITEMS[q]) {
      renderCanidoResult(q);
    } else {
      canidoResultEl.innerHTML = "";
    }
  });

  renderCanidoResult(Object.keys(CANIDO_ITEMS)[0]);
  canidoSearchEl.value = Object.keys(CANIDO_ITEMS)[0];
}

function renderCanidoResult(name) {
  const item = CANIDO_ITEMS[name];
  if (!item) {
    canidoResultEl.innerHTML = `<p class="muted">아직 준비 중인 항목이에요.</p>`;
    return;
  }
  canidoResultEl.innerHTML = `
    <div class="canido-result-card">
      <span class="canido-badge ${item.level}">${item.label}</span>
      <div>
        <div style="font-weight:600;">${name}</div>
        <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:2px;">${item.reason}</div>
      </div>
    </div>
  `;
}

// ---------- 인증 상태 ----------

onAuthStateChanged(auth, async (user) => {
  if (user) {
    statusEl.textContent = `${user.displayName}님으로 로그인됨 (${user.email})`;
    loginBtn.hidden = true;
    logoutBtn.hidden = false;

    try {
      const householdId = await getUserHouseholdId(user.uid);
      if (householdId) {
        currentHouseholdId = householdId;
        watchHousehold(householdId);
      } else {
        pageHeaderEl.hidden = false;
        appShell.hidden = true;
        onboardingWizardEl.hidden = false;
        startWizard("fresh", null);
      }
    } catch (err) {
      statusEl.textContent = `데이터를 불러오지 못했어요: ${err.message}`;
      console.error(err);
    }
  } else {
    if (unsubscribeHousehold) {
      unsubscribeHousehold();
      unsubscribeHousehold = null;
    }
    if (unsubscribeEvents) {
      unsubscribeEvents();
      unsubscribeEvents = null;
    }
    if (unsubscribeCheckin) {
      unsubscribeCheckin();
      unsubscribeCheckin = null;
    }
    if (unsubscribeCustomTodos) {
      unsubscribeCustomTodos();
      unsubscribeCustomTodos = null;
    }
    recentEvents = [];
    todayCheckin = null;
    customTodos = [];
    statusEl.textContent = "로그인되지 않음";
    loginBtn.hidden = false;
    logoutBtn.hidden = true;
    pageHeaderEl.hidden = false;
    authSectionEl.hidden = false;
    onboardingWizardEl.hidden = true;
    appShell.hidden = true;
  }
});
