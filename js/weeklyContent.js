// 일반적인 임신 정보 안내이며 의료 조언이 아닙니다.
// 정확한 상태 판단과 검사/시술 일정은 반드시 담당 산부인과와 상담하세요.
export const MEDICAL_DISCLAIMER =
  "이 정보는 일반적인 안내이며 의료 조언이 아니에요. 정확한 건 담당 산부인과와 상담해줘.";

// 주차별 아기 발달 / 엄마 몸 변화 (인덱스 0 = 1주차)
export const WEEKLY_INFO = [
  { baby: "아직 수정 전 단계예요. 마지막 생리 시작일을 기준으로 주차를 계산해요.", mom: "특별한 신체 변화는 아직 없어요." },
  { baby: "배란이 임박한 시기예요.", mom: "배란일 즈음이라 컨디션 변화가 있을 수 있어요." },
  { baby: "수정이 이루어지는 시기예요. 수정란이 나팔관을 지나 자궁으로 이동해요.", mom: "아직 임신 사실을 알기 어려운 시기예요." },
  { baby: "수정란이 자궁 내막에 착상해요. 이때부터 임신 호르몬(hCG)이 분비되기 시작해요.", mom: "생리 예정일이 지나 임신테스트기에 양성이 뜰 수 있는 시기예요." },
  { baby: "아기의 심장, 신경관 등 주요 기관이 형성되기 시작해요.", mom: "입덧, 피로감, 가슴 통증 등 초기 임신 증상이 나타날 수 있어요." },
  { baby: "심장이 뛰기 시작하고, 팔다리 싹이 생겨요.", mom: "입덧이 심해질 수 있는 시기예요." },
  { baby: "뇌와 얼굴 형태가 발달하기 시작해요.", mom: "자궁이 커지면서 아랫배가 당기는 느낌이 들 수 있어요." },
  { baby: "손가락, 발가락이 형성되기 시작해요.", mom: "호르몬 변화로 감정 기복이 심해질 수 있어요." },
  { baby: "태아의 주요 장기가 대부분 형성 완료 단계에 들어가요.", mom: "자궁이 자몽 정도 크기로 커져요." },
  { baby: "이 시기부터 '배아' 대신 '태아'로 불려요.", mom: "입덧이 정점을 찍고 서서히 나아지기 시작할 수 있어요." },
  { baby: "손발톱이 자라기 시작하고, 초음파로 태아 형태가 뚜렷이 보여요.", mom: "자궁이 골반 위로 올라오기 시작해요." },
  { baby: "반사 신경이 발달해 태아가 움직이기 시작해요 (아직 태동은 느껴지지 않아요).", mom: "1분기가 끝나가며 입덧이 완화되는 경우가 많아요." },
  { baby: "외부 성기 형태가 구분되기 시작해요.", mom: "2분기 진입을 앞두고 컨디션이 좋아지는 경우가 많아요." },
  { baby: "태아가 양수 안에서 자유롭게 움직여요.", mom: "안정기에 접어들며 컨디션이 회복되는 경우가 많아요." },
  { baby: "태아가 빛을 감지할 수 있게 돼요.", mom: "배가 눈에 띄게 나오기 시작해요." },
  { baby: "태아의 뼈가 단단해지기 시작해요.", mom: "태동을 처음 느끼기 시작할 수 있는 시기예요." },
  { baby: "태아에게 지방이 축적되기 시작해요.", mom: "체중이 본격적으로 늘기 시작해요." },
  { baby: "청각이 발달해 소리를 듣기 시작해요.", mom: "태동을 더 뚜렷하게 느낄 수 있어요." },
  { baby: "태아 피부를 보호하는 '태지'가 형성돼요.", mom: "자궁이 배꼽 높이까지 올라와요." },
  { baby: "임신 중반, 초음파로 성별을 확인할 수 있는 시기예요.", mom: "정밀 초음파(기형아 검사)를 받는 시기예요." },
  { baby: "태아의 소화 기능이 발달해요.", mom: "태동이 규칙적으로 느껴지기 시작해요." },
  { baby: "태아의 눈썹, 눈꺼풀이 형성돼요.", mom: "허리 통증이 생길 수 있어요." },
  { baby: "태아 청력이 더욱 발달해 외부 소리에 반응해요.", mom: "튼살 예방 관리를 시작하기 좋은 시기예요." },
  { baby: "폐가 발달하며 생존 가능성이 생기기 시작하는 시기예요.", mom: "임신성당뇨 검사를 받는 시기예요." },
  { baby: "태아가 딸꾹질을 할 수 있어요.", mom: "부종이 생기기 시작할 수 있어요." },
  { baby: "눈을 뜨기 시작해요.", mom: "숨이 차는 느낌이 들 수 있어요." },
  { baby: "2분기 마지막 주, 뇌 활동이 활발해져요.", mom: "3분기 진입을 앞두고 있어요." },
  { baby: "3분기 시작, 눈을 깜빡일 수 있어요.", mom: "정기검진이 2주 간격으로 바뀌는 시기예요." },
  { baby: "근육과 폐가 계속 성숙해져요.", mom: "몸이 무거워지고 쉽게 피곤해질 수 있어요." },
  { baby: "태아가 체온 조절 능력을 갖추기 시작해요.", mom: "가진통(브랙스턴 힉스)을 느낄 수 있어요." },
  { baby: "태아 뇌 발달이 빠르게 진행돼요.", mom: "출산 준비물을 챙기기 시작하기 좋은 시기예요." },
  { baby: "태아가 머리를 아래로 하는 자세를 잡기 시작하는 경우가 많아요.", mom: "잦은 화장실 출입 등 불편함이 늘 수 있어요." },
  { baby: "뼈가 단단해지지만 두개골은 유연하게 유지돼요.", mom: "카시트 등 출산 준비물을 마련하는 시기예요." },
  { baby: "태아의 신경계가 거의 완성돼요.", mom: "정기검진이 더 잦아질 수 있어요." },
  { baby: "신장이 대부분 발달을 마쳐요.", mom: "GBS(B형 연쇄상구균) 검사를 받는 시기예요." },
  { baby: "폐를 제외한 대부분 장기가 성숙 완료 단계예요.", mom: "출산이 머지않아 병원 가방을 최종 점검할 시기예요." },
  { baby: "의학적으로 '조기 만삭'에 해당해요.", mom: "언제 진통이 와도 이상하지 않은 시기예요." },
  { baby: "태아가 태어날 준비를 거의 마쳤어요.", mom: "이슬, 양막파수 등 출산 신호를 주의 깊게 살펴야 해요." },
  { baby: "'만삭'에 해당하는 시기예요.", mom: "예정일이 임박해 언제든 진통이 시작될 수 있어요." },
  { baby: "출산 예정일이에요.", mom: "예정일이 지나도 1~2주 정도는 정상 범위이니 병원 안내에 따르면 돼요." },
];

// 담당(assignee): 둘 다 정할 수 있지만, 지금은 일반적인 기준으로 기본값만 붙여둠 (나중에 직접 바꾸는 기능 추가 예정)
// 체크리스트 항목: weekStart~weekEnd 사이일 때 노출됨. tags가 있으면 해당 태그를 선택한 가구에만 노출.
export const CHECKLIST_ITEMS = [
  { id: "first-prenatal-visit", label: "첫 산전 진찰 예약하기", weekStart: 5, weekEnd: 10, required: true, assignee: "both" },
  { id: "happy-card", label: "국민행복카드(임신·출산 진료비 지원) 신청하기", weekStart: 5, weekEnd: 12, required: true, assignee: "dad" },
  { id: "nt-scan", label: "1차 기형아 검사(NT 초음파) 받기", weekStart: 11, weekEnd: 13, required: true, assignee: "mom" },
  { id: "nipt-or-quad", label: "니프티(NIPT) 또는 쿼드 검사 상담하기", weekStart: 10, weekEnd: 20, required: false, assignee: "mom" },
  { id: "anatomy-scan", label: "정밀 초음파(기형아 정밀검사) 받기", weekStart: 20, weekEnd: 24, required: true, assignee: "mom" },
  { id: "postpartum-care-center", label: "산후조리원 알아보고 예약하기", weekStart: 16, weekEnd: 28, required: false, assignee: "both" },
  { id: "glucose-test", label: "임신성당뇨 검사(경구당부하검사) 받기", weekStart: 24, weekEnd: 28, required: true, assignee: "mom" },
  { id: "maternity-leave", label: "출산휴가 신청 준비하기 (회사에 통보)", weekStart: 28, weekEnd: 34, required: true, assignee: "mom" },
  { id: "parental-leave", label: "육아휴직 신청 알아보기", weekStart: 28, weekEnd: 36, required: false, assignee: "dad" },
  { id: "gbs-test", label: "B형 연쇄상구균(GBS) 검사 받기", weekStart: 35, weekEnd: 37, required: true, assignee: "mom" },
  { id: "hospital-bag", label: "출산 가방(입원 준비물) 챙기기", weekStart: 34, weekEnd: 38, required: true, assignee: "both" },
  { id: "car-seat", label: "카시트 구매 및 설치하기", weekStart: 32, weekEnd: 38, required: true, assignee: "dad" },
  { id: "birth-plan", label: "분만 병원/조리원 최종 확정하기", weekStart: 30, weekEnd: 36, required: true, assignee: "both" },
  { id: "baby-name", label: "아기 이름 후보 정하기", weekStart: 20, weekEnd: 38, required: false, assignee: "both" },
  { id: "birth-registration-info", label: "출생신고 서류 미리 확인하기", weekStart: 36, weekEnd: 40, required: false, assignee: "dad" },
  { id: "first-meeting-voucher", label: "첫만남이용권/아동수당 신청 방법 알아두기", weekStart: 36, weekEnd: 40, required: false, assignee: "dad" },

  // 상황 태그별 추가 항목
  { id: "twins-extra-checkup", label: "쌍둥이 임신 - 정기검진 주기 단축 상담하기", weekStart: 20, weekEnd: 32, required: true, tags: ["twins"], assignee: "mom" },
  { id: "high-risk-followup", label: "고위험 임신 - 정밀 모니터링 일정 상담하기", weekStart: 1, weekEnd: 40, required: true, tags: ["high-risk"], assignee: "mom" },
  { id: "gd-diet", label: "임신성당뇨 - 식단/혈당 관리 교육받기", weekStart: 24, weekEnd: 36, required: true, tags: ["gestational-diabetes"], assignee: "mom" },
  { id: "advanced-age-screening", label: "노산 - 정밀 유전 검사 상담하기", weekStart: 10, weekEnd: 20, required: true, tags: ["advanced-age"], assignee: "mom" },
  { id: "c-section-prep", label: "제왕절개 - 수술 일정 및 마취 상담하기", weekStart: 32, weekEnd: 38, required: true, tags: ["c-section"], assignee: "mom" },
  { id: "morning-sickness-care", label: "입덧 심함 - 수액/약물 치료 상담하기", weekStart: 6, weekEnd: 16, required: false, tags: ["severe-morning-sickness"], assignee: "dad" },
];

// 트라이메스터별 아빠 조언 (0=1분기, 1=2분기, 2=3분기)
export const DAD_TIPS = [
  "입덧이나 피로감으로 힘들어할 수 있는 시기예요. 집안일을 더 맡아주고, 냄새에 예민해질 수 있으니 배려해주세요.",
  "컨디션이 좋아지는 시기지만 체력 소모는 계속 커져요. 무거운 건 대신 들어주고, 정기검진에 같이 가주세요.",
  "몸이 무거워지고 잠들기 힘들어하는 시기예요. 출산 준비물을 같이 챙기고, 언제든 병원에 갈 수 있게 동선을 미리 확인해두세요.",
];

export function getDadTip(week) {
  const trimester = week <= 13 ? 0 : week <= 27 ? 1 : 2;
  return DAD_TIPS[trimester];
}

export function getWeeklyInfo(week) {
  const idx = Math.min(Math.max(week, 1), WEEKLY_INFO.length) - 1;
  return WEEKLY_INFO[idx];
}

export function getChecklistForWeek(week, householdTags = []) {
  return CHECKLIST_ITEMS.filter((item) => {
    const inRange = week >= item.weekStart && week <= item.weekEnd;
    const tagMatch = !item.tags || item.tags.some((t) => householdTags.includes(t));
    return inRange && tagMatch;
  });
}
