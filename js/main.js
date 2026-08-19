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
} from "./household.js";
import { SITUATION_TAGS } from "./tags.js";
import { calcPregnancyWeek, dueDateFromWeek } from "./pregnancy.js";
import { getWeeklyInfo, getChecklistForWeek, MEDICAL_DISCLAIMER } from "./weeklyContent.js";

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const statusEl = document.getElementById("auth-status");

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

const weekResultSection = document.getElementById("week-result-section");
const weekResultTitleEl = document.getElementById("week-result-title");
const weekBabyInfoEl = document.getElementById("week-baby-info");
const weekMomInfoEl = document.getElementById("week-mom-info");

const checklistSection = document.getElementById("checklist-section");
const checklistListEl = document.getElementById("checklist-list");
const checklistEmptyEl = document.getElementById("checklist-empty");

const disclaimerEl = document.getElementById("disclaimer-text");
disclaimerEl.textContent = MEDICAL_DISCLAIMER;

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
    // 저장 후 화면 갱신은 subscribeHousehold가 자동으로 처리함
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

function watchHousehold(householdId) {
  if (unsubscribeHousehold) unsubscribeHousehold();
  unsubscribeHousehold = subscribeHousehold(householdId, (household) => {
    renderHousehold(household);
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
    onboardingSection.hidden = true;
    showWeekResult(household);
  } else {
    onboardingSection.hidden = false;
    weekResultSection.hidden = true;
    checklistSection.hidden = true;
    disclaimerEl.hidden = true;
  }
}

function showWeekResult(household) {
  const { week, dayOfWeek, isBorn } = calcPregnancyWeek(household.dueDate);
  weekResultSection.hidden = false;
  disclaimerEl.hidden = false;

  if (isBorn) {
    weekResultTitleEl.textContent = "출산 예정일이 지났어요";
    weekBabyInfoEl.textContent = "";
    weekMomInfoEl.textContent =
      "혹시 출산했다면, 다음 업데이트에서 아기 개월수 모드로 전환하는 기능을 추가할게.";
    checklistSection.hidden = true;
    return;
  }

  const info = getWeeklyInfo(week);
  weekResultTitleEl.textContent = `임신 ${week}주 ${dayOfWeek}일차`;
  weekBabyInfoEl.textContent = info.baby;
  weekMomInfoEl.textContent = info.mom;

  renderChecklist(week, household);
}

function renderChecklist(week, household) {
  const items = getChecklistForWeek(week, household.tags || []);
  const state = household.checklistState || {};

  checklistSection.hidden = false;
  checklistListEl.innerHTML = "";
  checklistEmptyEl.hidden = items.length > 0;

  for (const item of items) {
    const checked = !!state[item.id];
    const li = document.createElement("li");
    li.className = checked ? "checked" : "";

    const checkboxId = `check-${item.id}`;
    li.innerHTML = `
      <input type="checkbox" id="${checkboxId}" ${checked ? "checked" : ""} />
      <label for="${checkboxId}">${item.label}${item.required ? '<span class="required-badge">필수</span>' : ""}</label>
    `;

    const checkbox = li.querySelector("input");
    checkbox.addEventListener("change", async () => {
      li.classList.toggle("checked", checkbox.checked);
      try {
        await toggleChecklistItem(household.id, item.id, checkbox.checked);
      } catch (err) {
        checkbox.checked = !checkbox.checked;
        li.classList.toggle("checked", checkbox.checked);
        alert("저장 실패: " + err.message);
      }
    });

    checklistListEl.appendChild(li);
  }
}

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
    householdSetupSection.hidden = true;
    householdConnectedSection.hidden = true;
    onboardingSection.hidden = true;
    weekResultSection.hidden = true;
    checklistSection.hidden = true;
    disclaimerEl.hidden = true;
  }
});
