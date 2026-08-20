import { db } from "./firebase.js?v=15";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  collection,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 헷갈리는 글자(0,O,1,I) 빼고 초대 코드 생성
function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function getUserHouseholdId(uid) {
  const userSnap = await getDoc(doc(db, "users", uid));
  return userSnap.exists() ? userSnap.data().householdId ?? null : null;
}

export async function createHousehold(uid) {
  const inviteCode = generateInviteCode();
  const householdRef = doc(db, "households", crypto.randomUUID());

  await setDoc(householdRef, {
    members: [uid],
    inviteCode,
    createdAt: Date.now(),
  });
  await setDoc(doc(db, "inviteCodes", inviteCode), {
    householdId: householdRef.id,
  });
  await setDoc(doc(db, "users", uid), { householdId: householdRef.id }, { merge: true });

  return { householdId: householdRef.id, inviteCode };
}

export async function joinHousehold(uid, rawCode) {
  const inviteCode = rawCode.trim().toUpperCase();
  const codeSnap = await getDoc(doc(db, "inviteCodes", inviteCode));
  if (!codeSnap.exists()) {
    throw new Error("초대 코드를 찾을 수 없어요. 다시 확인해주세요.");
  }

  const { householdId } = codeSnap.data();
  const householdRef = doc(db, "households", householdId);

  // arrayUnion은 이미 멤버여도 중복 추가되지 않으므로, 참여 전 상태를 굳이 먼저 읽을 필요가 없음
  // (참여 전 사람은 애초에 이 문서를 읽을 권한이 없어서, 읽으려 하면 규칙 위반으로 막혀버림)
  await updateDoc(householdRef, {
    members: arrayUnion(uid),
  });
  await setDoc(doc(db, "users", uid), { householdId }, { merge: true });

  return householdId;
}

export async function getHousehold(householdId) {
  const snap = await getDoc(doc(db, "households", householdId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// pregnancyReference: { date, week, day } (병원 기준 정보) 또는 null (LMP 계산 방식이라 기준 정보 없음)
export async function saveHouseholdSetup(householdId, { dueDate, tags, pregnancyReference }) {
  await updateDoc(doc(db, "households", householdId), {
    dueDate,
    tags,
    pregnancyReference: pregnancyReference || null,
  });
}

// 가구 문서를 실시간 구독 (배우자가 체크하면 즉시 반영됨)
export function subscribeHousehold(householdId, callback) {
  return onSnapshot(doc(db, "households", householdId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    }
  });
}

// checklistState[itemId] = { done, byName, at } - 누가 언제 체크했는지도 같이 저장해서 배우자 피드에 씀
export async function toggleChecklistItem(householdId, itemId, checked, byName) {
  await updateDoc(doc(db, "households", householdId), {
    [`checklistState.${itemId}`]: { done: checked, byName, at: Date.now() },
  });
}

// roles[uid] = "mom" | "dad" - 이 계정을 쓰는 사람이 어느 쪽인지
export async function setMemberRole(householdId, uid, role) {
  await updateDoc(doc(db, "households", householdId), {
    [`roles.${uid}`]: role,
  });
}

export async function saveProfile(householdId, { age, dueDate, pregnancyReference }) {
  await updateDoc(doc(db, "households", householdId), {
    momAge: age,
    dueDate,
    pregnancyReference: pregnancyReference || null,
  });
}

export async function saveNextCheckup(householdId, dateStr) {
  await updateDoc(doc(db, "households", householdId), {
    nextCheckupDate: dateStr,
  });
}

export async function saveTodayMood(householdId, dateStr, mood, byName) {
  await setDoc(doc(db, "households", householdId, "checkins", dateStr), {
    mood,
    byName,
    at: Date.now(),
  });
}

export function subscribeTodayCheckin(householdId, dateStr, callback) {
  return onSnapshot(doc(db, "households", householdId, "checkins", dateStr), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

// 자유 기록 하나 추가 (자유 메모, 증상 기록 등 전부 이걸로 통일)
// type: "note" | "symptom" 등
export async function addEvent(householdId, { type, rawText, byName }) {
  await addDoc(collection(db, "households", householdId, "events"), {
    type,
    rawText,
    byName,
    at: Date.now(),
  });
}

export async function deleteEvent(householdId, eventId) {
  await deleteDoc(doc(db, "households", householdId, "events", eventId));
}

// 최근 기록 N개를 실시간 구독 (홈 화면 "최근 기록" 미리보기, 배우자 활동 피드에 사용)
export function subscribeRecentEvents(householdId, count, callback) {
  const q = query(
    collection(db, "households", householdId, "events"),
    orderBy("at", "desc"),
    limit(count)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// 홈 화면 상단 "배우자 활동" 피드용 - 체크리스트 완료 기록 중 가장 최근 것 (사건 기록은 별도로 subscribeRecentEvents가 다룸)
export function getLatestChecklistActivity(household, checklistItemLabels) {
  const checklistState = household.checklistState || {};
  let latest = null;

  for (const [itemId, entry] of Object.entries(checklistState)) {
    if (entry && entry.done && entry.byName) {
      const at = entry.at || 0;
      if (!latest || at > latest.at) {
        latest = { text: `${checklistItemLabels[itemId] || itemId} 완료했어요`, byName: entry.byName, at };
      }
    }
  }

  return latest;
}

// 자유 추가형 할 일 (⑤) - assignee: "mom" | "dad" | "both"
export async function addCustomTodo(householdId, { label, assignee, byName }) {
  await addDoc(collection(db, "households", householdId, "todos"), {
    label,
    assignee,
    done: false,
    byName,
    at: Date.now(),
  });
}

export function subscribeCustomTodos(householdId, callback) {
  const q = query(collection(db, "households", householdId, "todos"), orderBy("at", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function toggleCustomTodo(householdId, todoId, done) {
  await updateDoc(doc(db, "households", householdId, "todos", todoId), { done });
}

export async function deleteCustomTodo(householdId, todoId) {
  await deleteDoc(doc(db, "households", householdId, "todos", todoId));
}
