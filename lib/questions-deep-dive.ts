import type { Question } from "./questions";

/** C9 1순위 Pain별 Deep Dive 보기 */
const C9_1_OPTIONS: Record<string, { value: string; label: string; hasText?: boolean }[]> = {
  C1: [
    { value: "c9_1_std", label: "작업표준·순서 미준수" },
    { value: "c9_1_4m", label: "변경점·4M 미기록" },
    { value: "c9_1_qual", label: "교육·자격 미이수" },
    { value: "c9_1_etc", label: "기타", hasText: true },
  ],
  C2: [
    { value: "c9_1_handover", label: "인수인계" },
    { value: "c9_1_std_share", label: "작업표준 미공유" },
    { value: "c9_1_skill", label: "숙련도·기준 편차" },
    { value: "c9_1_etc", label: "기타", hasText: true },
  ],
  C3: [
    { value: "c9_1_q2p", label: "검사→생산 전달" },
    { value: "c9_1_q2d", label: "검사→개발 feedback" },
    { value: "c9_1_data", label: "기록·데이터 누락" },
    { value: "c9_1_etc", label: "기타", hasText: true },
  ],
  C4: [
    { value: "c9_1_lot", label: "LOT·공정 이력" },
    { value: "c9_1_code", label: "불량코드·분류" },
    { value: "c9_1_handoff", label: "부서 간 handoff" },
    { value: "c9_1_etc", label: "기타", hasText: true },
  ],
  C5: [
    { value: "c9_1_appr", label: "승인 지연" },
    { value: "c9_1_after", label: "사후 기록" },
    { value: "c9_1_impact", label: "변경 영향 미평가" },
    { value: "c9_1_etc", label: "기타", hasText: true },
  ],
  C6: [
    { value: "c9_1_root", label: "원인분석" },
    { value: "c9_1_report", label: "보고서·8D 작성" },
    { value: "c9_1_chase", label: "부서별 조치 독촉" },
    { value: "c9_1_verify", label: "효과확인" },
    { value: "c9_1_etc", label: "기타", hasText: true },
  ],
  C7: [
    { value: "c9_1_cost", label: "손실비용 산출" },
    { value: "c9_1_kpi", label: "KPI·통계 집계" },
    { value: "c9_1_rpt", label: "경영 보고서 작성" },
    { value: "c9_1_etc", label: "기타", hasText: true },
  ],
  C8: [
    { value: "c9_1_evidence", label: "증빙·기록 취합" },
    { value: "c9_1_align", label: "현장-문서 정합 설명" },
    { value: "c9_1_track", label: "지적사항 시정 추적" },
    { value: "c9_1_etc", label: "기타", hasText: true },
  ],
};

function c9FirstQuestions(): Question[] {
  return Object.entries(C9_1_OPTIONS).map(([painId, options]) => ({
    id: `C9-1_${painId}`,
    type: "single" as const,
    title:
      "(Deep Dive) 1순위 상황에서, 가장 시간·스트레스를 소모하는 세부 작업은?",
    required: true,
    showIf: { questionId: "C9", rankFirst: painId },
    options,
  }));
}

export const DEEP_DIVE_A: Question[] = [
  {
    id: "A6-1",
    type: "single",
    title:
      "(Deep Dive) 품질·운영 IT·도구 도입과 관련한 예산·결정 경험은?",
    required: true,
    showIf: { questionId: "A6", anyOf: ["1", "2"] },
    options: [
      { value: "a6_1_lt100", label: "100만 원 미만 — 부서·담당자 자체 결정 가능" },
      { value: "a6_1_100_500", label: "100~500만 원 — 품의·내부 승인 필요" },
      { value: "a6_1_ge500", label: "500만 원 이상 — 경영진 승인 필수" },
      { value: "a6_1_it", label: "IT·구매 부서 별도 프로세스 (RFP·견적 비교)" },
      { value: "a6_1_none", label: "해당 경험 없음" },
    ],
  },
];

export const DEEP_DIVE_B: Question[] = [
  {
    id: "B2-1",
    type: "single",
    title: "(Deep Dive) 그 지적의 대표 영역은 어디였습니까?",
    required: true,
    showIf: { questionId: "B2", anyOf: ["1", "2"] },
    options: [
      { value: "b2_1_purch", label: "구매·수입검사" },
      { value: "b2_1_prod", label: "생산·가공·조립" },
      { value: "b2_1_insp", label: "검사·시험" },
      { value: "b2_1_ship", label: "출하·물류" },
      { value: "b2_1_4m", label: "설계변경·4M 변경" },
      { value: "b2_1_edu", label: "교육·자격·인증" },
      { value: "b2_1_doc", label: "기록·문서 관리" },
      { value: "b2_1_etc", label: "기타", hasText: true },
    ],
  },
  {
    id: "B2-2",
    type: "single",
    title: "(Deep Dive) 해당 영역에서 문서와 현장이 어긋나는 주된 이유는?",
    required: true,
    showIf: { questionId: "B2-1", answered: true },
    options: [
      { value: "b2_2_mismatch", label: "절차·표준이 현장 실정과 맞지 않음" },
      { value: "b2_2_delivery", label: "납기 압박으로 절차·기록이 생략됨" },
      { value: "b2_2_habit", label: "기록·증빙 습관·양식이 정착되지 않음" },
      { value: "b2_2_turnover", label: "담당자 교체·인수인계 미흡" },
      { value: "b2_2_system", label: "시스템·전산 양식이 현장과 맞지 않음" },
      { value: "b2_2_etc", label: "기타", hasText: true },
    ],
  },
];

export const DEEP_DIVE_C: Question[] = [
  ...c9FirstQuestions(),
  {
    id: "C9-2",
    type: "single",
    title:
      "(Deep Dive) 위 세부 작업이 계속 해결되지 않을 때 조직에 가장 큰 결과는?",
    required: true,
    showIf: {
      or: Object.keys(C9_1_OPTIONS).map((painId) => ({
        questionId: `C9-1_${painId}`,
        answered: true as const,
      })),
    },
    options: [
      { value: "c9_2_audit", label: "Audit·인증·거래 조건 리스크" },
      { value: "c9_2_claim", label: "고객 클레임·납기·라인스톱" },
      { value: "c9_2_recur", label: "동일 불량 재발·손실비용 증가" },
      { value: "c9_2_mgmt", label: "경영진 보고·의사결정·투자 지연" },
      { value: "c9_2_burnout", label: "담당자 번아웃·이직·업무 공백" },
      { value: "c9_2_etc", label: "기타", hasText: true },
    ],
  },
  {
    id: "F4",
    type: "rank",
    title:
      "아래 4개 업무 영역 중, 지난 1년간 조직 차원의 부담·리스크가 컸던 순서대로 1~4위를 매겨 주십시오.",
    note: "각 영역에 서로 다른 순위(1~4)를 지정해 주세요.",
    required: true,
    items: [
      { id: "f4_a", label: "고객·인증 Audit 대응 (증빙·서류·현장 설명)" },
      { id: "f4_b", label: "CAPA/NCR 작성·추적·효과확인" },
      { id: "f4_c", label: "불량·재발·원인분석·부서 간 공유" },
      { id: "f4_d", label: "납기 지연 예측·대응·고객 커뮤니케이션" },
    ],
  },
];

export const DEEP_DIVE_D: Question[] = [
  {
    id: "D2-1",
    type: "single",
    title: "(Deep Dive) 수기·엑셀 방식을 유지하는 주된 이유는?",
    required: true,
    showIf: { questionId: "D2", anyOf: ["1", "2"] },
    options: [
      { value: "d2_1_cost", label: "비용·IT 인프라 부재" },
      { value: "d2_1_resist", label: "현장·조직의 도입·변화 거부" },
      { value: "d2_1_fail", label: "ERP/QMS 도입·정착 실패 경험" },
      { value: "d2_1_size", label: "회사 규모상 현재 방식으로 충분" },
      { value: "d2_1_policy", label: "전사 IT·표준 정책 없음" },
      { value: "d2_1_etc", label: "기타", hasText: true },
    ],
  },
  {
    id: "D3-1",
    type: "single",
    title:
      '(Deep Dive) "절차서가 실정과 맞지 않는다"고 느끼는 대표 공정·영역은?',
    required: true,
    showIf: { questionId: "D3", includes: "2" },
    options: [
      { value: "d3_1_in", label: "수입검사" },
      { value: "d3_1_asm", label: "조립·가공·제조" },
      { value: "d3_1_final", label: "최종검사·시험" },
      { value: "d3_1_ship", label: "출하·물류" },
      { value: "d3_1_4m", label: "설계·4M 변경" },
      { value: "d3_1_edu", label: "교육·자격" },
      { value: "d3_1_etc", label: "기타", hasText: true },
    ],
  },
];

export const DEEP_DIVE_E: Question[] = [
  {
    id: "E2-1_budget",
    type: "single",
    title: "(Deep Dive) 선택하신 장애의 구체적 우려는?",
    required: true,
    showIf: { questionId: "E2", value: "1" },
    options: [
      { value: "e2_1_roi", label: "ROI·효과 불명" },
      { value: "e2_1_mgmt", label: "경영진 관심·우선순위 부족" },
      { value: "e2_1_capex", label: "CAPEX vs OPEX 논쟁" },
    ],
  },
  {
    id: "E2-1_adoption",
    type: "single",
    title: "(Deep Dive) 선택하신 장애의 구체적 우려는?",
    required: true,
    showIf: { questionId: "E2", value: "2" },
    options: [
      { value: "e2_1_input", label: "추가 입력·이중 기록" },
      { value: "e2_1_train", label: "교육·온보딩 부담" },
      { value: "e2_1_habit", label: "기존 습관·저항" },
    ],
  },
  {
    id: "E2-1_erp",
    type: "multi",
    title: "(Deep Dive) 중복 우려 대상 시스템을 모두 선택해 주십시오.",
    required: true,
    showIf: { questionId: "E2", value: "3" },
    options: [
      { value: "e2_1_erp", label: "ERP" },
      { value: "e2_1_mes", label: "MES" },
      { value: "e2_1_qms", label: "QMS" },
      { value: "e2_1_gw", label: "그룹웨어" },
      { value: "e2_1_etc", label: "기타", hasText: true },
    ],
  },
  {
    id: "E2-1_data",
    type: "single",
    title: "(Deep Dive) 선택하신 장애의 구체적 우려는?",
    required: true,
    showIf: { questionId: "E2", value: "4" },
    options: [
      { value: "e2_1_nda", label: "고객 계약·NDA" },
      { value: "e2_1_secret", label: "공정·영업 기밀" },
      { value: "e2_1_onprem", label: "망분리·온프레 정책" },
      { value: "e2_1_ai", label: "AI 학습·2차 이용 우려" },
    ],
  },
  {
    id: "E2-1_proof",
    type: "single",
    title: "(Deep Dive) 선택하신 장애의 구체적 우려는?",
    required: true,
    showIf: { questionId: "E2", value: "5" },
    options: [
      { value: "e2_1_ref", label: "동종업계·유사 규모 사례" },
      { value: "e2_1_poc", label: "우리 공정 PoC" },
      { value: "e2_1_itsec", label: "내부 IT·보안 승인" },
    ],
  },
  {
    id: "E3-1",
    type: "multi",
    title: "(Deep Dive) 본 도입·유료 전환을 검토할 조건은? (최대 2개)",
    max: 2,
    required: true,
    showIf: { questionId: "E3", anyOf: ["2", "3"] },
    options: [
      { value: "e3_1_time", label: "업무시간 일정 % 이상 절감" },
      { value: "e3_1_audit", label: "Audit·심사 지적 N건 이상 감소" },
      { value: "e3_1_capa", label: "CAPA 완결 기간 단축" },
      { value: "e3_1_roi", label: "경영진 승인 가능 수준의 ROI 입증" },
      { value: "e3_1_opex", label: "월 OPEX 일정 금액 이하" },
      { value: "e3_1_etc", label: "기타", hasText: true },
    ],
  },
];
