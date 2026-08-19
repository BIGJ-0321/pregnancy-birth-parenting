// 일반적인 안내이며 의료 조언이 아닙니다. 실제 사용 전 신뢰할 수 있는 의학 기준으로 다시 검증이 필요해요.
// level: "ok"(가능) | "caution"(주의) | "avoid"(피하기)
export const CANIDO_ITEMS = {
  커피: { level: "caution", label: "주의", reason: "카페인은 하루 200mg(커피 1~2잔) 이하로 제한하는 게 좋아요." },
  타이레놀: { level: "ok", label: "가능", reason: "아세트아미노펜 성분은 임신 중 비교적 안전한 진통제로 알려져 있어요. 용량은 지켜주세요." },
  회: { level: "avoid", label: "피하기", reason: "날 생선은 리스테리아균 등 감염 위험이 있어 피하는 게 좋아요." },
  비행기: { level: "caution", label: "주의", reason: "36주 이전엔 대체로 괜찮지만, 항공사별 규정과 장거리 시 혈전 위험을 확인하세요." },
  사우나: { level: "avoid", label: "피하기", reason: "체온이 많이 오르면 태아에 영향을 줄 수 있어 고온 사우나는 피하는 게 좋아요." },
  염색: { level: "caution", label: "주의", reason: "환기가 잘 되는 곳에서, 중기 이후에 하는 걸 권장해요." },
  마사지: { level: "ok", label: "가능", reason: "임신부 전용 마사지로 압을 약하게 받는 건 대체로 괜찮아요." },
};
