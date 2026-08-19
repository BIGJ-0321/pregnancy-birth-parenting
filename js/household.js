import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
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
  const householdSnap = await getDoc(householdRef);

  if (householdSnap.exists() && householdSnap.data().members.includes(uid)) {
    await setDoc(doc(db, "users", uid), { householdId }, { merge: true });
    return householdId;
  }

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

export async function saveHouseholdSetup(householdId, { dueDate, tags }) {
  await updateDoc(doc(db, "households", householdId), {
    dueDate,
    tags,
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

export async function saveProfile(householdId, { age, dueDate }) {
  await updateDoc(doc(db, "households", householdId), {
    momAge: age,
    dueDate,
  });
}

export async function saveNextCheckup(householdId, dateStr) {
  await updateDoc(doc(db, "households", householdId), {
    nextCheckupDate: dateStr,
  });
}

export async function addSymptomRecord(householdId, symptom, byName) {
  await updateDoc(doc(db, "households", householdId), {
    symptomLog: arrayUnion({ symptom, byName, at: Date.now() }),
  });
}

// 홈 화면 상단 "배우자 활동" 피드에 쓸 가장 최근 활동 하나를 찾음
export function getLatestActivity(household, checklistItemLabels) {
  const events = [];

  const checklistState = household.checklistState || {};
  for (const [itemId, entry] of Object.entries(checklistState)) {
    if (entry && entry.done && entry.byName) {
      events.push({
        text: `${checklistItemLabels[itemId] || itemId} 완료`,
        byName: entry.byName,
        at: entry.at || 0,
      });
    }
  }

  const symptomLog = household.symptomLog || [];
  for (const entry of symptomLog) {
    events.push({
      text: `'${entry.symptom}' 증상 기록`,
      byName: entry.byName,
      at: entry.at || 0,
    });
  }

  if (events.length === 0) return null;
  events.sort((a, b) => b.at - a.at);
  return events[0];
}
