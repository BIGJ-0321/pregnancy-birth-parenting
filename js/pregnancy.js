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

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}
