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

export async function toggleChecklistItem(householdId, itemId, checked) {
  await updateDoc(doc(db, "households", householdId), {
    [`checklistState.${itemId}`]: checked,
  });
}
