import { auth, googleProvider } from "./firebase.js";
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
  addSymptomRecord,
  getLatestActivity,
  saveNextCheckup,
} from "./household.js";
import { SITUATION_TAGS } from "./tags.js";
import { calcPregnancyWeek, dueDateFromWeek, daysUntil } from "./pregnancy.js";
import {
  getWeeklyInfo,
  getChecklistForWeek,
  getDadTip,
  getMomCaution,
  MEDICAL_DISCLAIMER,
  CHECKLIST_ITEMS,
} from "./weeklyContent.js";
import { SYMPTOMS } from "./symptomsContent.js";
import { CANIDO_ITEMS } from "./canidoContent.js";

// ---------- 공통: 로그인 / 가구 연결 / 온보딩 ----------

const authSectionEl = document.getElementById("auth-section");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const statusEl = document.getElementById("auth-status");
const appLogoutBtn = document.getElementById("app-logout-btn");

const householdSetupSection = document.getElementById("household-setup-section");
const householdConnectedSection = document.getElementById("household-connected-section");
const createHouseholdBtn = document.getElementById("create-household-btn");
const joinHouseholdBtn = document.getElementById("join-household-btn");
const inviteCodeInput = document.getElementById("invite-code-input");
const householdErrorEl = document.getElementById("household-error");
const householdStatusEl = document.getElementById("household-status");
const inviteCodeDisplayEl = document.getElementById("invite-code-display");

const onboardingSection = document.getElementById("onboarding-section");
const dueDateInput = document.getElementById("due-date-input");
const dueDateField = document.getElementById("due-date-field");
const currentWeekInput = document.getElementById("current-week-input");
const currentWeekField = document.getElementById("current-week-field");
const dueModeRadios = document.querySelectorAll('input[name="due-mode"]');
const tagsListEl = document.getElementById("tags-list");
const saveOnboardingBtn = document.getElementById("save-onboarding-btn");
const onboardingErrorEl = document.getElementById("onboarding-error");

const appShell = document.getElementById("app-shell");

let currentHouseholdId = null;
let unsubscribeHousehold = null;

renderTagChips();

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

createHouseholdBtn.addEventListener("click", async () => {
  const uid = auth.currentUser.uid;
  createHouseholdBtn.disabled = true;
  try {
    const { householdId } = await createHousehold(uid);
    currentHouseholdId = householdId;
    watchHousehold(householdId);
  } catch (err) {
    showHouseholdError(err.message);
  } finally {
    createHouseholdBtn.disabled = false;
  }
});

joinHouseholdBtn.addEventListener("click", async () => {
  const uid = auth.currentUser.uid;
  const code = inviteCodeInput.value;
  if (!code) return;
  joinHouseholdBtn.disabled = true;
  try {
    const householdId = await joinHousehold(uid, code);
    currentHouseholdId = householdId;
    watchHousehold(householdId);
  } catch (err) {
    showHouseholdError(err.message);
  } finally {
    joinHouseholdBtn.disabled = false;
  }
});

for (const radio of dueModeRadios) {
  radio.addEventListener("change", () => {
    const mode = document.querySelector('input[name="due-mode"]:checked').value;
    dueDateField.hidden = mode !== "due-date";
    currentWeekField.hidden = mode !== "current-week";
  });
}

saveOnboardingBtn.addEventListener("click", async () => {
  const mode = document.querySelector('input[name="due-mode"]:checked').value;
  let dueDate;

  if (mode === "due-date") {
    if (!dueDateInput.value) {
      showOnboardingError("출산 예정일을 입력해줘.");
      return;
    }
    dueDate = dueDateInput.value;
  } else {
    const week = Number(currentWeekInput.value);
    if (!week || week < 1 || week > 42) {
      showOnboardingError("현재 주차를 1~42 사이로 입력해줘.");
      return;
    }
    dueDate = dueDateFromWeek(week);
  }

  const selectedTags = Array.from(
    tagsListEl.querySelectorAll("input[type=checkbox]:checked")
  ).map((el) => el.value);

  saveOnboardingBtn.disabled = true;
  try {
    await saveHouseholdSetup(currentHouseholdId, { dueDate, tags: selectedTags });
  } catch (err) {
    showOnboardingError(err.message);
  } finally {
    saveOnboardingBtn.disabled = false;
  }
});

function renderTagChips() {
  tagsListEl.innerHTML = "";
  for (const tag of SITUATION_TAGS) {
    const label = document.createElement("label");
    label.className = "tag-chip";
    label.innerHTML = `<input type="checkbox" value="${tag.id}" /> ${tag.label}`;
    const checkbox = label.querySelector("input");
    checkbox.addEventListener("change", () => {
      label.classList.toggle("checked", checkbox.checked);
    });
    tagsListEl.appendChild(label);
  }
}

function showHouseholdError(message) {
  householdErrorEl.textContent = message;
  householdErrorEl.hidden = false;
}

function showOnboardingError(message) {
  onboardingErrorEl.textContent = message;
  onboardingErrorEl.hidden = false;
}

function currentUserName() {
  return auth.currentUser?.displayName || "배우자";
}

function watchHousehold(householdId) {
  if (unsubscribeHousehold) unsubscribeHousehold();
  let firstRender = true;
  unsubscribeHousehold = subscribeHousehold(householdId, (household) => {
    renderHousehold(household);
    if (firstRender) {
      setupSymptomsView(household.id);
      setupCanidoView();
      firstRender = false;
    }
  });
}

function renderHousehold(household) {
  householdSetupSection.hidden = true;
  householdConnectedSection.hidden = false;

  const memberCount = household.members.length;
  householdStatusEl.textContent =
    memberCount >= 2
      ? "배우자와 연결됐어요!"
      : "가구가 만들어졌어요. 아래 코드를 배우자에게 알려주세요.";
  inviteCodeDisplayEl.textContent = household.inviteCode;

  if (household.dueDate) {
    // 셋업 다 끝났으면 로그인/가구연결 카드는 접어두고 바로 앱 화면으로
    authSectionEl.hidden = true;
    householdConnectedSection.hidden = true;
    onboardingSection.hidden = true;
    appShell.hidden = false;
    renderHome(household);
    renderTodos(household);
  } else {
    authSectionEl.hidden = false;
    onboardingSection.hidden = false;
    appShell.hidden = true;
  }
}

// ---------- 탭 전환 ----------

const tabButtons = document.querySelectorAll(".tab-btn");
const views = {
  home: document.getElementById("view-home"),
  symptoms: document.getElementById("view-symptoms"),
  canido: document.getElementById("view-canido"),
  todos: document.getElementById("view-todos"),
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
const disclaimerEl = document.getElementById("disclaimer-text");
disclaimerEl.textContent = MEDICAL_DISCLAIMER;

let currentRole = "mom";
let lastHousehold = null;

roleMomBtn.addEventListener("click", () => setRole("mom"));
roleDadBtn.addEventListener("click", () => setRole("dad"));

function setRole(role) {
  currentRole = role;
  roleMomBtn.classList.toggle("active", role === "mom");
  roleDadBtn.classList.toggle("active", role === "dad");
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

// role-toggle/todo-summary-link/partner-feed는 CSS에서 display:flex를 고정으로 주기 때문에,
// hidden 속성 대신 style.display로 직접 토글해야 확실히 감춰짐
function setVisible(el, visible, displayValue = "flex") {
  el.style.display = visible ? displayValue : "none";
}

function renderHome(household) {
  lastHousehold = household;
  const { week, dayOfWeek, isBorn } = calcPregnancyWeek(household.dueDate);

  if (isBorn) {
    weekResultTitleEl.textContent = "출산 예정일이 지났어요";
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
  weekBabyInfoEl.textContent = info.baby;

  const labels = {};
  for (const item of CHECKLIST_ITEMS) labels[item.id] = item.label;
  const activity = getLatestActivity(household, labels);
  if (activity) {
    partnerFeedEl.textContent = `👋 ${activity.byName}님이 최근 '${activity.text}' 했어요`;
    setVisible(partnerFeedEl, true);
  } else {
    setVisible(partnerFeedEl, false);
  }

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
  const { week, isBorn } = calcPregnancyWeek(household.dueDate);
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

  const { week, isBorn } = calcPregnancyWeek(household.dueDate);
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
      await addSymptomRecord(householdId, name, currentUserName());
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
        <div style="font-size:0.85rem; color:#555; margin-top:2px;">${item.reason}</div>
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
        householdSetupSection.hidden = false;
        householdConnectedSection.hidden = true;
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
    statusEl.textContent = "로그인되지 않음";
    loginBtn.hidden = false;
    logoutBtn.hidden = true;
    authSectionEl.hidden = false;
    householdSetupSection.hidden = true;
    householdConnectedSection.hidden = true;
    onboardingSection.hidden = true;
    appShell.hidden = true;
  }
});
