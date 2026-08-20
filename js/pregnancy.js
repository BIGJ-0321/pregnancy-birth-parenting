const PREGNANCY_DAYS = 280; // 40주 기준 (LMP ~ 예정일)

// 예정일 기준으로 현재 임신 주차/일수를 계산
export function calcPregnancyWeek(dueDateStr, today = new Date()) {
  const dueDate = new Date(dueDateStr + "T00:00:00");
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilDue = Math.round((dueDate - stripTime(today)) / msPerDay);
  const daysPregnant = PREGNANCY_DAYS - daysUntilDue;

  const week = Math.floor(daysPregnant / 7) + 1;
  const dayOfWeek = (daysPregnant % 7) + 1;

  return {
    week: clamp(week, 1, 42),
    dayOfWeek: clamp(dayOfWeek, 1, 7),
    daysUntilDue,
    isBorn: daysUntilDue < -14, // 예정일 2주 이상 지나면 이미 출산했다고 간주
  };
}

// 병원에서 알려준 "기준일에 O주 O일이었다"를 기준으로, 오늘까지 지난 날짜만큼 더해서 현재 주차/일수를 계산
// (예정일로 역산하지 않음 - 병원이 실측/초음파로 알려준 숫자를 그대로 신뢰함)
export function calcCurrentWeekFromReference(referenceDateStr, referenceWeek, referenceDay, today = new Date()) {
  const referenceDate = new Date(referenceDateStr + "T00:00:00");
  const msPerDay = 1000 * 60 * 60 * 24;
  const elapsedDays = Math.round((stripTime(today) - referenceDate) / msPerDay);

  const daysPregnantAtReference = (referenceWeek - 1) * 7 + (referenceDay - 1);
  const daysPregnant = daysPregnantAtReference + elapsedDays;

  const week = Math.floor(daysPregnant / 7) + 1;
  const dayOfWeek = (daysPregnant % 7) + 1;

  return {
    week: clamp(week, 1, 42),
    dayOfWeek: clamp(dayOfWeek, 1, 7),
  };
}

// 화면 표시용 종합 함수: 병원 기준 정보(pregnancyReference)가 있으면 그걸로 주차를,
// 없으면(레거시 데이터) 예정일 역산으로 주차를 계산. 예정일/D-day는 항상 저장된 dueDate 그대로 사용.
export function getPregnancyStatus(dueDateStr, pregnancyReference, today = new Date()) {
  const daysUntilDue = daysUntil(dueDateStr, today);
  const isBorn = daysUntilDue < -14;

  const { week, dayOfWeek } = pregnancyReference
    ? calcCurrentWeekFromReference(
        pregnancyReference.date,
        pregnancyReference.week,
        pregnancyReference.day,
        today
      )
    : calcPregnancyWeek(dueDateStr, today);

  return { week, dayOfWeek, isBorn, daysUntilDue };
}

// 출생일 기준으로 아기 개월 수를 계산
export function calcBabyAgeMonths(birthDateStr, today = new Date()) {
  const birthDate = new Date(birthDateStr + "T00:00:00");
  const t = stripTime(today);
  let months = (t.getFullYear() - birthDate.getFullYear()) * 12 + (t.getMonth() - birthDate.getMonth());
  if (t.getDate() < birthDate.getDate()) months -= 1;

  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.round((t - birthDate) / msPerDay);

  return { months: Math.max(months, 0), days: Math.max(days, 0) };
}

// 마지막 생리 시작일(LMP) + 280일 = 예정일
export function dueDateFromLMP(lmpDateStr) {
  const lmp = new Date(lmpDateStr + "T00:00:00");
  const due = new Date(lmp.getFullYear(), lmp.getMonth(), lmp.getDate() + PREGNANCY_DAYS);

  const yyyy = due.getFullYear();
  const mm = String(due.getMonth() + 1).padStart(2, "0");
  const dd = String(due.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// 현재 주차(예: 8주차 시작)를 기준으로 역산한 예정일을 YYYY-MM-DD로 반환
export function dueDateFromWeek(week, today = new Date()) {
  const daysPregnant = (week - 1) * 7;
  const daysUntilDue = PREGNANCY_DAYS - daysPregnant;
  const t = stripTime(today);
  const due = new Date(t.getFullYear(), t.getMonth(), t.getDate() + daysUntilDue);

  const yyyy = due.getFullYear();
  const mm = String(due.getMonth() + 1).padStart(2, "0");
  const dd = String(due.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// 오늘부터 특정 날짜까지 며칠 남았는지 (지났으면 음수)
export function daysUntil(dateStr, today = new Date()) {
  const target = new Date(dateStr + "T00:00:00");
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((target - stripTime(today)) / msPerDay);
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}
