/**
 * Survey_Based_v03.md — 32 메인 + Deep Dive + 연락·동의
 */
import type { Question, Section } from "./questions";

const PRICE_BANDS = [
  "10만원 미만",
  "10만~30만원 미만",
  "30만~50만원 미만",
  "50만~100만원 미만",
  "100만~200만원 미만",
  "200만원 이상",
];

const E25_COLS = [
  { value: "e25_manual", label: "수기" },
  { value: "e25_excel", label: "엑셀·공유폴더" },
  { value: "e25_gw", label: "그룹웨어" },
  { value: "e25_erp", label: "ERP" },
  { value: "e25_mes", label: "MES" },
  { value: "e25_qms", label: "QMS" },
  { value: "e25_outsrc", label: "외부위탁" },
  { value: "e25_unknown", label: "모름" },
];

const Q20_SYSTEMS = [
  { value: "sys_delivery", label: "납기·CT — 납기 지연·Cycle Time·병목 원인 분석 및 단축 시스템" },
  { value: "sys_capa", label: "불량·CAPA — NCR/CAPA/8D 자동 작성·재발방지 추적 시스템" },
  { value: "sys_oee", label: "생산성·OEE — 설비정지·작업대기·실적 분석 및 개선 우선순위 시스템" },
  { value: "sys_audit", label: "Audit 자동화 — ISO·고객 Audit 증빙·체크리스트 자동 정리 시스템" },
  { value: "sys_kpi", label: "KPI 대시보드 — 생산·품질·납기·개선 데이터 통합 AI 운영 대시보드" },
  { value: "sys_vsm", label: "VSM·Lean — 공정 CT·WIP·병목·납기위험 시각화 시스템" },
  { value: "sys_tbd", label: "PoC·벤치마크 후 결정" },
];

const ARCH_OPTIONS = [
  { value: "pref_erp", label: "기존 ERP 품질 모듈 확장" },
  { value: "pref_mes", label: "MES 연계(현장 실적·불량)" },
  { value: "pref_qms", label: "독립 QMS + ERP/MES API" },
  { value: "pref_saas", label: "독립 SaaS(클라oud) 구독" },
  { value: "pref_onprem", label: "사내 서버(온프레)" },
  { value: "pref_excel", label: "엑셀·그룹웨어 고도화" },
];

const F28_BARRIER_FOLLOWUPS: {
  value: string;
  title: string;
  options: { value: string; label: string; hasText?: boolean }[];
}[] = [
  {
    value: "f28_roi",
    title: "예산·ROI 불확실 — 구체적 우려는?",
    options: [
      { value: "f28_1_roi_effect", label: "효과·ROI 입증 불가" },
      { value: "f28_1_roi_mgmt", label: "경영진 비용·우선순위 미관심" },
      { value: "f28_1_roi_capex", label: "CAPEX vs OPEX 논쟁" },
    ],
  },
  {
    value: "f28_staff",
    title: "전담 인력 부족 — 구체적 우려는?",
    options: [
      { value: "f28_1_staff_none", label: "품질·IT 전담 인력 없음" },
      { value: "f28_1_staff_load", label: "기존 담당자 업무 과중" },
      { value: "f28_1_staff_skill", label: "디지털·데이터 역량 부족" },
    ],
  },
  {
    value: "f28_mgmt",
    title: "경영진 우선순위 — 구체적 우려는?",
    options: [
      { value: "f28_1_mgmt_prod", label: "생산·납기가 품질보다 우선" },
      { value: "f28_1_mgmt_short", label: "단기 실적 중심 의사결정" },
      { value: "f28_1_mgmt_vis", label: "품질·개선 가시성 부족" },
    ],
  },
  {
    value: "f28_data",
    title: "데이터 품질·표준화 — 구체적 우려는?",
    options: [
      { value: "f28_1_data_std", label: "데이터 표준·코드 미정립" },
      { value: "f28_1_data_nda", label: "고객 NDA·반출 제한" },
      { value: "f28_1_data_ai", label: "AI 학습·외부 유출 우려" },
    ],
  },
  {
    value: "f28_security",
    title: "IT·보안·망분리 — 구체적 우려는?",
    options: [
      { value: "f28_1_sec_air", label: "망분리·폐쇄망 정책" },
      { value: "f28_1_sec_cloud", label: "클라oud·SaaS 사용 제한" },
      { value: "f28_1_sec_audit", label: "보안 Audit·인증 부담" },
    ],
  },
  {
    value: "f28_dup",
    title: "ERP/MES 중복 — 구체적 우려는?",
    options: [
      { value: "f28_1_dup_erp", label: "기존 ERP와 기능 중복" },
      { value: "f28_1_dup_mes", label: "MES·현장 시스템과 중복" },
      { value: "f28_1_dup_cost", label: "이중 투자·유지비 부담" },
    ],
  },
  {
    value: "f28_change",
    title: "현장 변화·입력 부담 — 구체적 우려는?",
    options: [
      { value: "f28_1_change_input", label: "추가 입력·이중 기록" },
      { value: "f28_1_change_train", label: "교육·온보딩 부담" },
      { value: "f28_1_change_habit", label: "현장 저항·습관" },
    ],
  },
  {
    value: "f28_ref",
    title: "레퍼런스 부족 — 구체적 우려는?",
    options: [
      { value: "f28_1_ref_ind", label: "동종·유사 업종 사례 부족" },
      { value: "f28_1_ref_size", label: "규모·공정 차이" },
      { value: "f28_1_ref_effect", label: "효과 검증 불확실" },
    ],
  },
  {
    value: "f28_vendor",
    title: "벤더 리스크 — 구체적 우려는?",
    options: [
      { value: "f28_1_vendor_lock", label: "벤더 lock-in" },
      { value: "f28_1_vendor_exit", label: "도입 후 이탈·유지비" },
      { value: "f28_1_vendor_support", label: "국내 지원·SLA 불안" },
    ],
  },
];

export const SECTIONS: Section[] = [
  {
    id: "A",
    name: "섹션 A",
    heading: "기업·응답자 프로파일",
    intro: "귀사와 응답자님에 대한 기본 정보입니다. 통계 분류 목적으로만 사용됩니다.",
    questions: [
      {
        id: "A1",
        type: "single",
        title: "귀사의 주력 사업 분야는 무엇입니까?",
        required: true,
        options: [
          { value: "0", label: "반도체 제조" },
          { value: "1", label: "반도체 장비 제조" },
          { value: "2", label: "반도체 부품·소재 제조" },
          { value: "3", label: "반도체 장비·부품 가공/조립 협력 (1~3차)" },
          { value: "4", label: "자동차 부품" },
          { value: "5", label: "이차전지(배터리) 관련" },
          { value: "6", label: "전자·기계 일반" },
          { value: "7", label: "기타 제조", hasText: true },
        ],
      },
      {
        id: "A2",
        type: "single",
        title: "귀사의 상시 근로자 수는?",
        required: true,
        options: [
          { value: "a2_v2_1", label: "10명 미만" },
          { value: "a2_v2_2", label: "10~19명" },
          { value: "a2_v2_3", label: "20~49명" },
          { value: "a2_v2_4", label: "50~99명" },
          { value: "a2_v2_5", label: "100~299명" },
          { value: "a2_v2_6", label: "300명 이상" },
        ],
      },
      {
        id: "A3",
        type: "multi",
        title: "귀사가 보유한 인증을 모두 선택해 주십시오.",
        required: true,
        options: [
          { value: "1", label: "ISO 9001" },
          { value: "2", label: "ISO 14001" },
          { value: "3", label: "ISO 45001" },
          { value: "4", label: "IATF 16949" },
          { value: "5", label: "고객사 자체 인증" },
          { value: "8", label: "ESG 관련" },
          { value: "9", label: "ISO 53001" },
          { value: "6", label: "없음", exclusive: true },
          { value: "7", label: "취득 검토 중", hasText: true },
        ],
      },
      {
        id: "A4",
        type: "single",
        title: "귀사의 주요 고객 형태는?",
        required: true,
        options: [
          { value: "1", label: "대기업 직납" },
          { value: "2", label: "1차 협력사 납품(2차)" },
          { value: "3", label: "2차 이하 납품" },
          { value: "4", label: "해외 직수출" },
          { value: "5", label: "내수 일반" },
        ],
      },
      {
        id: "A5",
        type: "single",
        title: "응답자님의 직무는?",
        required: true,
        options: [
          { value: "1", label: "품질(QA/QC)" },
          { value: "2", label: "제조/생산" },
          { value: "3", label: "개발/기술" },
          { value: "4", label: "생산관리/구매" },
          { value: "5", label: "경영진" },
          { value: "6", label: "영업/마케팅/CS" },
          { value: "7", label: "기타", hasText: true },
        ],
      },
      {
        id: "A6",
        type: "single",
        title: "품질·운영 개선(시스템·AI 도구 포함) 의사결정 관여도는?",
        required: true,
        options: [
          { value: "1", label: "최종 결정권자" },
          { value: "2", label: "결정에 직접 참여(품의·기안)" },
          { value: "3", label: "의견 제시 수준" },
          { value: "4", label: "관여하지 않음" },
        ],
      },
      {
        id: "A6-1",
        type: "single",
        title: "품질·운영 IT·AI 도구 도입 예산·결정 경험은?",
        required: true,
        showIf: { questionId: "A6", anyOf: ["1", "2"] },
        options: [
          { value: "a6_1_lt100", label: "100만 원 미만 — 담당자 자체 결정" },
          { value: "a6_1_100_500", label: "100~500만 원 — 품의·내부 승인" },
          { value: "a6_1_ge500", label: "500만 원 이상 — 경영진 승인" },
          { value: "a6_1_it", label: "IT·구매 별도 프로세스(RFP)" },
          { value: "a6_1_none", label: "해당 경험 없음" },
        ],
      },
    ],
  },
  {
    id: "B",
    name: "섹션 B",
    heading: "운영 현황 (지난 1년 사실)",
    intro:
      "지난 1년간 실제 발생 이력입니다. 정확한 수치를 모르시면 가장 가까운 것을 선택해 주세요.",
    questions: [
      {
        id: "B1",
        type: "single",
        title: "지난 1년간, 고객사 Audit(수검) 또는 ISO 사후심사 횟수는?",
        required: true,
        options: [
          { value: "1", label: "없음" },
          { value: "2", label: "1회" },
          { value: "3", label: "2~3회" },
          { value: "4", label: "4회 이상" },
          { value: "5", label: "모름" },
        ],
      },
      {
        id: "B2",
        type: "single",
        title:
          "최근 심사·Audit에서 “문서와 실제 업무가 다르다”는 지적을 받은 적이 있습니까?",
        required: true,
        options: [
          { value: "1", label: "있다 — 시정조치 요구" },
          { value: "2", label: "있다 — 구두 지적" },
          { value: "3", label: "없다" },
          { value: "4", label: "모름/해당 없음" },
        ],
      },
      {
        id: "B2-1",
        type: "single",
        title: "지적받은 대표 영역은?",
        required: true,
        showIf: { questionId: "B2", anyOf: ["1", "2"] },
        options: [
          { value: "b2_1_purch", label: "구매·수입검사" },
          { value: "b2_1_prod", label: "생산·가공" },
          { value: "b2_1_insp", label: "검사·시험" },
          { value: "b2_1_ship", label: "출하·물류" },
          { value: "b2_1_4m", label: "설계·4M 변경" },
          { value: "b2_1_edu", label: "교육·자격" },
          { value: "b2_1_doc", label: "기록·문서" },
          { value: "b2_1_etc", label: "기타", hasText: true },
        ],
      },
      {
        id: "B2-2",
        type: "single",
        title: "문서와 현장이 어긋나는 주된 이유는?",
        required: true,
        showIf: { questionId: "B2-1", answered: true },
        options: [
          { value: "b2_2_mismatch", label: "절차가 현장 실정과 맞지 않음" },
          { value: "b2_2_delivery", label: "납기 압박으로 절차·기록 생략" },
          { value: "b2_2_habit", label: "기록·증빙 습관 미정착" },
          { value: "b2_2_turnover", label: "담당자 교체·인수인계 미흡" },
          { value: "b2_2_system", label: "시스템·양식 불일치" },
          { value: "b2_2_etc", label: "기타", hasText: true },
        ],
      },
      {
        id: "B3",
        type: "single",
        title:
          "지난 1년간 출하 불합격·고객 클레임(반품·선별·라인스톱 포함) 건수는?",
        required: true,
        options: [
          { value: "1", label: "없음" },
          { value: "2", label: "1~3" },
          { value: "3", label: "4~10" },
          { value: "4", label: "11건 이상" },
          { value: "5", label: "집계 안 함" },
          { value: "6", label: "기타", hasText: true },
        ],
      },
      {
        id: "B3A",
        type: "single",
        title: "불량·재작업·폐기 비율(수량 또는 원가 대비)은?",
        required: true,
        options: [
          { value: "1", label: "1% 미만" },
          { value: "2", label: "1~3%" },
          { value: "3", label: "3~5%" },
          { value: "4", label: "5~10%" },
          { value: "5", label: "10% 이상" },
          { value: "6", label: "집계 안 함" },
        ],
      },
      {
        id: "q10_basis",
        type: "single",
        title: "위 비율의 분모 기준은?",
        required: true,
        showIf: { questionId: "B3A", exceptValues: ["6"] },
        options: [
          { value: "q10_basis_qty", label: "수량" },
          { value: "q10_basis_cost", label: "원가(금액)" },
          { value: "q10_basis_gut", label: "감으로 추정" },
        ],
      },
      {
        id: "B4",
        type: "single",
        title: "CAPA 1건 완결(원인→대책→효과확인) 평균 소요는?",
        required: true,
        options: [
          { value: "b4_v2_lte1w", label: "1주 이내" },
          { value: "b4_v2_1_2w", label: "1~2주" },
          { value: "b4_v2_2_4w", label: "2~4주" },
          { value: "b4_v2_gt4w", label: "1개월 초과" },
          { value: "b4_v2_effect_weak", label: "효과확인 미흡" },
          { value: "b4_v2_not_operated", label: "CAPA 프로세스 없음/유명무실" },
        ],
      },
      {
        id: "B6",
        type: "single",
        title: "동일·유사 불량 재발 경험이 있습니까?",
        required: true,
        options: [
          { value: "1", label: "없다" },
          { value: "2", label: "1~2회" },
          { value: "3", label: "3회 이상" },
          { value: "4", label: "재발 추적 체계 없음" },
        ],
      },
      {
        id: "B7",
        type: "single",
        title: "Audit 준비(문서·증빙 취합) 1회당 투입 man-day는?",
        required: true,
        options: [
          { value: "b7_v2_lt3", label: "3일 미만" },
          { value: "b7_v2_3to6", label: "3~6" },
          { value: "b7_v2_7to11", label: "7~11" },
          { value: "b7_v2_ge12", label: "12일 이상" },
          { value: "b7_v2_unknown", label: "모름" },
          { value: "b7_v2_dedicated", label: "전담 상주" },
        ],
      },
    ],
  },
  {
    id: "C",
    name: "섹션 C",
    heading: "Pain·우선순위 (Survey_Base 5대 축)",
    intro:
      "아래 5가지는 제조기업이 공통으로 겪는 운영 Pain입니다. 발생 빈도(1~5)와 업무 영향도(1~5)를 각각 선택해 주십시오.",
    questions: [
      {
        id: "P14",
        type: "dualScale",
        title: "납기 지연·Cycle Time 증가·병목 공정 문제",
        tag: "납기·CT",
        required: true,
      },
      {
        id: "P15",
        type: "dualScale",
        title: "불량·클레임·재작업·NCR/CAPA/8D 처리 부담",
        tag: "불량·CAPA",
        required: true,
      },
      {
        id: "P15-1",
        type: "single",
        title: "가장 시간·스트레스를 소모하는 세부 작업은?",
        required: true,
        showIf: { questionId: "P15", painThreshold: { freqGte: 3, sevGte: 4 } },
        options: [
          { value: "p15_1_root", label: "원인분석" },
          { value: "p15_1_report", label: "CAPA/8D 보고서 작성" },
          { value: "p15_1_chase", label: "부서 간 조치 독촉" },
          { value: "p15_1_verify", label: "효과확인" },
          { value: "p15_1_recur", label: "재발 추적" },
          { value: "p15_1_etc", label: "기타", hasText: true },
        ],
      },
      {
        id: "P16",
        type: "dualScale",
        title: "생산성 저하·설비정지·작업대기(OEE·TPM 관련)",
        tag: "생산성·OEE",
        required: true,
      },
      {
        id: "P17",
        type: "dualScale",
        title: "Audit·내부심사 증빙·기록 준비 부담",
        tag: "Audit",
        required: true,
      },
      {
        id: "P18",
        type: "dualScale",
        title: "생산·품질·납기 데이터 분산 → 의사결정·경영 보고 지연",
        tag: "데이터·KPI",
        required: true,
      },
      {
        id: "C_ATT",
        type: "dualScale",
        title:
          "이 문항은 응답 품질 확인용입니다. 발생 빈도에서 2번을 선택해 주십시오.",
        attention: true,
        sevOptional: true,
        required: true,
      },
      {
        id: "Q20",
        type: "rankPick",
        title:
          "아래 7개 도입 시스템 중, 귀사에 가장 시급한 1순위와 2순위를 골라 주십시오. (서로 달라야 함)",
        note: "Survey_Base 핵심 — 납기·불량·생산성·Audit·KPI 통합",
        required: true,
        options: Q20_SYSTEMS,
      },
      {
        id: "Q20-1",
        type: "single",
        title: "그 시스템이 필요하다고 느끼는 가장 큰 이유는?",
        required: true,
        showIf: { questionId: "Q20", rankPickFirstAnswered: true },
        options: [
          { value: "q20_1_delivery", label: "고객 납기 지연이 자주 발생" },
          { value: "q20_1_defect", label: "불량·재작업 비용 증가" },
          { value: "q20_1_expert", label: "원인분석이 사람 경험에 의존" },
          { value: "q20_1_audit", label: "Audit 자료 준비에 시간 과다" },
          { value: "q20_1_oee", label: "생산성·설비효율 저하" },
          { value: "q20_1_kpi", label: "경영 보고·KPI 작성 번거로움" },
          { value: "q20_1_data", label: "현장 데이터 분산·판단 지연" },
          { value: "q20_1_etc", label: "기타", hasText: true },
        ],
      },
      {
        id: "Q20-2",
        type: "single",
        title: "향후 도입 1순위 아키텍처 선호는?",
        required: true,
        showIf: {
          and: [
            { questionId: "Q20", rankPickFirstAnswered: true },
            { questionId: "Q20", rankPickFirstNot: "sys_tbd" },
          ],
        },
        options: ARCH_OPTIONS,
      },
    ],
  },
  {
    id: "D",
    name: "섹션 D",
    heading: "근본원인·역량",
    intro: "품질 업무가 현장에서 실행되기 어려운 이유를 여쭙니다.",
    questions: [
      {
        id: "D1",
        type: "single",
        title: "품질·운영 업무 전담 인원(겸직 제외)은?",
        required: true,
        options: [
          { value: "1", label: "없음(전원 겸직)" },
          { value: "2", label: "1명" },
          { value: "3", label: "2~3" },
          { value: "4", label: "4~5" },
          { value: "5", label: "6명 이상" },
        ],
      },
      {
        id: "D3",
        type: "multi",
        title: "ISO·품질 절차가 현장에서 안 지켜지는 가장 큰 이유는? (최대 2개)",
        max: 2,
        required: true,
        options: [
          { value: "1", label: "납기 압박" },
          { value: "2", label: "절차서가 실정과 불일치(인증용)" },
          { value: "3", label: "현장 교육·인지 부족" },
          { value: "4", label: "확인·감사 체계 없음" },
          { value: "5", label: "경영진이 생산·납기 우선" },
          { value: "6", label: "잘 지켜짐(해당 없음)", exclusive: true },
        ],
      },
      {
        id: "D3-1",
        type: "single",
        title: "실정과 어긋난 대표 공정·영역은?",
        required: true,
        showIf: { questionId: "D3", includes: "2" },
        options: [
          { value: "d3_1_in", label: "수입검사" },
          { value: "d3_1_asm", label: "조립·가공" },
          { value: "d3_1_final", label: "최종검사" },
          { value: "d3_1_ship", label: "출하" },
          { value: "d3_1_4m", label: "설계·4M" },
          { value: "d3_1_edu", label: "교육·자격" },
          { value: "d3_1_etc", label: "기타", hasText: true },
        ],
      },
      {
        id: "D4",
        type: "single",
        title: "외부 ISO 컨설팅 경험과 만족도는?",
        required: true,
        options: [
          {
            value: "d4_unsat",
            label: "있다 — 아쉬웠다(현장 모름/양식만/유지 안 됨/비용 대비 불명)",
          },
          { value: "d4_sat", label: "있다 — 만족" },
          { value: "d4_no", label: "없다" },
        ],
      },
      {
        id: "D5",
        type: "text",
        title: "(선택) “이것 하나만 해결되면…” 가장 시급한 업무 1가지를 적어 주십시오.",
        placeholder: "자유 기입 (선택)",
        required: false,
      },
    ],
  },
  {
    id: "E",
    name: "섹션 E",
    heading: "IT·데이터 환경",
    intro: "귀사의 현재 정보관리 방식과 데이터 제약을 파악하기 위한 문항입니다.",
    questions: [
      {
        id: "E25",
        type: "singleMatrix",
        title: "아래 3개 영역의 현재 관리 방식을 각각 선택해 주십시오.",
        required: true,
        rows: [
          { id: "quality", label: "품질(NCR·CAPA·Audit)" },
          { id: "production", label: "생산·공정(실적·불량)" },
          { id: "delivery", label: "납기·수주" },
        ],
        options: E25_COLS,
      },
      {
        id: "E25-1",
        type: "single",
        title: "수기·엑셀을 유지하는 주된 이유는?",
        required: true,
        showIf: {
          questionId: "E25",
          matrixAnyRowAnyOf: ["e25_manual", "e25_excel"],
        },
        options: [
          { value: "e25_1_cost", label: "비용·IT 인프라 부재" },
          { value: "e25_1_resist", label: "현장·조직 변화 거부" },
          { value: "e25_1_fail", label: "ERP/QMS 도입 실패 경험" },
          { value: "e25_1_size", label: "규모상 충분" },
          { value: "e25_1_policy", label: "전사 IT 정책 없음" },
          { value: "e25_1_etc", label: "기타", hasText: true },
        ],
      },
      {
        id: "E25-2",
        type: "multi",
        title: "정식 운영 중인 시스템을 모두 선택해 주십시오.",
        required: true,
        showIf: {
          questionId: "E25",
          matrixAnyRowAnyOf: ["e25_erp", "e25_mes", "e25_qms", "e25_gw"],
        },
        options: [
          { value: "e25_2_erp", label: "ERP", hasText: true },
          { value: "e25_2_mes", label: "MES" },
          { value: "e25_2_plm", label: "PLM" },
          { value: "e25_2_qms", label: "QMS" },
          { value: "e25_2_gw", label: "그룹웨어" },
          { value: "e25_2_bi", label: "BI" },
          { value: "e25_2_none", label: "위 없음 — 엑셀·수기 중심", exclusive: true },
          { value: "e25_2_etc", label: "기타", hasText: true },
        ],
      },
      {
        id: "E25-3",
        type: "single",
        title: "배포·운영 형태는?",
        required: true,
        showIf: {
          questionId: "E25-2",
          anyOf: ["e25_2_erp", "e25_2_mes", "e25_2_qms"],
        },
        options: [
          { value: "deploy_onprem", label: "온프레" },
          { value: "deploy_private", label: "프라이빗 클라우드" },
          { value: "deploy_saas", label: "퍼블릭 SaaS" },
          { value: "deploy_hybrid", label: "혼합" },
          { value: "deploy_unknown", label: "모름" },
        ],
      },
      {
        id: "E26",
        type: "single",
        title:
          "품질·공정 데이터를 외부(클라oud·SaaS·AI)에 올릴 때 가장 큰 제약은?",
        required: true,
        options: [
          { value: "e26_contract", label: "고객 계약·반출 제한" },
          { value: "e26_secret", label: "공정·영업 기밀" },
          { value: "e26_pii", label: "개인정보·노무" },
          { value: "e26_onprem", label: "IT 정책상 온프레만" },
          { value: "e26_none", label: "제약 없음" },
          { value: "e26_tbd", label: "기준 미정" },
          { value: "e26_etc", label: "기타", hasText: true },
        ],
      },
    ],
  },
  {
    id: "F",
    name: "섹션 F",
    heading: "솔루션 수용·구매 가능성",
    intro:
      "불량·납기·생산 이슈 발생 시 CAPA/8D 초안을 AI가 작성하고, Audit 증빙·KPI 리포트를 자동 연결하는 제조 운영 AI 시스템이 있다고 가정합니다.",
    questions: [
      {
        id: "F27",
        type: "matrix5",
        title: "위 유형 서비스의 핵심 3기능에 대한 도움 정도 (1=전혀 ~ 5=매우)",
        scaleHint: { low: "전혀 도움 안 됨", high: "매우 도움 됨" },
        required: true,
        rows: [
          { id: "a", label: "CAPA/8D/NCR 초안 자동 작성·추적" },
          { id: "b", label: "Audit·내부심사 증빙·기록 자동 점검" },
          { id: "c", label: "경영진 KPI·손실비용·납기 리스크 월간 리포트" },
        ],
      },
      {
        id: "F28",
        type: "multi",
        title: "도입을 막거나 지연시키는 요인 영향력 TOP 3 (정확히 3개)",
        note: "선택 순서대로 1순위·2순위·3순위가 기록됩니다.",
        exact: 3,
        required: true,
        options: [
          { value: "f28_roi", label: "예산·ROI 불확실" },
          { value: "f28_staff", label: "전담 인력 부족" },
          { value: "f28_mgmt", label: "경영진 우선순위" },
          { value: "f28_data", label: "데이터 품질·표준화" },
          { value: "f28_security", label: "IT·보안·망분리" },
          { value: "f28_dup", label: "ERP/MES 중복" },
          { value: "f28_change", label: "현장 변화·입력 부담" },
          { value: "f28_ref", label: "레퍼런스 부족" },
          { value: "f28_vendor", label: "벤더 리스크" },
          { value: "f28_none", label: "해당 없음/도입 계획 없음", exclusive: true },
        ],
      },
      ...F28_BARRIER_FOLLOWUPS.map(
        (f): Question => ({
          id: `F28-1_${f.value}`,
          type: "single",
          title: f.title,
          required: true,
          showIf: { questionId: "F28", rankFirst: f.value },
          options: f.options,
        })
      ),
      {
        id: "F29",
        type: "single",
        title:
          "AI 기반 개선 및 효과가 있다고 한다면 4~6주 유료 PoC 참여 의향은?",
        required: true,
        options: [
          { value: "1", label: "적극 검토(연락 요청)" },
          { value: "2", label: "조건 보고 검토" },
          { value: "3", label: "무료라면 검토" },
          { value: "4", label: "계획 없음" },
        ],
      },
      {
        id: "F29-1",
        type: "multi",
        title: "본 도입·유료 전환 조건 (상위 3개 선택)",
        note: "선택 순서대로 1순위·2순위·3순위가 기록됩니다.",
        exact: 3,
        required: true,
        showIf: { questionId: "F29", anyOf: ["2", "3"] },
        options: [
          {
            value: "f29_1_delivery",
            label: "납기 준수율 향상 또는 Cycle Time 단축 효과가 확인되는 것",
          },
          {
            value: "f29_1_defect",
            label: "불량, 재작업, 반복 부적합이 감소하는 것",
          },
          {
            value: "f29_1_cost",
            label: "원가절감 개선효과 가능한 것",
          },
          {
            value: "f29_1_kpi",
            label: "생산성·설비효율·품질 KPI 개선 효과가 확인되는 것",
          },
          {
            value: "f29_1_roi",
            label: "ROI가 입증되고 월 사용료가 감당 가능한 수준인 것",
          },
          {
            value: "f29_1_audit",
            label: "ISO 내부심사·고객 Audit 대응 시간이 줄어드는 것",
          },
          {
            value: "f29_1_capa",
            label: "NCR, CAPA, 8D 작성 및 시정조치 기간이 단축되는 것",
          },
          { value: "f29_1_etc", label: "기타", hasText: true },
        ],
      },
      {
        id: "F29-2",
        type: "single",
        title: "도입 승인·예산 집행 의사결정 구조는?",
        required: true,
        showIf: { questionId: "F29", anyOf: ["1", "2"] },
        options: [
          { value: "f29_2_dept", label: "부서장 자체" },
          { value: "f29_2_exec", label: "경영진 승인" },
          { value: "f29_2_it", label: "그룹 IT·구매" },
          { value: "f29_2_customer", label: "고객 요구 촉발" },
          { value: "f29_2_none", label: "논의 없음" },
        ],
      },
      {
        id: "F30",
        type: "priceMatrix",
        title: "(가격 민감도 조사) 월 구독료 수용도",
        bands: PRICE_BANDS,
        required: true,
        rows: [
          { id: "a", label: "너무 싸 의심" },
          { id: "b", label: "합리적" },
          { id: "c", label: "비싸지만 고려" },
          { id: "d", label: "너무 비싸 제외" },
        ],
      },
      {
        id: "F31",
        type: "single",
        title: "4~6주 유료 PoC 1회 비용 수용 범위는?",
        required: true,
        options: [
          { value: "1", label: "100만 미만" },
          { value: "2", label: "100~300만" },
          { value: "3", label: "300~500만" },
          { value: "4", label: "500~1,000만" },
          { value: "5", label: "1,000만 이상" },
          { value: "6", label: "검토 안 함" },
        ],
      },
      {
        id: "F32",
        type: "single",
        title: "20번 1순위 시스템에 월 구독·라이선스 지불 의향은?",
        required: true,
        options: [
          { value: "1", label: "즉시 검토(미팅 희망)" },
          { value: "2", label: "PoC·ROI 후" },
          { value: "3", label: "무료·저가 파일럿만" },
          { value: "4", label: "12개월 내 없음" },
        ],
      },
      {
        id: "F32-1",
        type: "multi",
        title: "PoC에서 반드시 검증할 KPI (해당 항목 모두 선택)",
        required: true,
        showIf: { questionId: "F32", anyOf: ["2", "3"] },
        options: [
          {
            value: "f32_1_delivery",
            label: "납기 준수·Cycle Time 단축",
          },
          {
            value: "f32_1_defect",
            label: "불량·클레임 원인분석 및 CAPA/8D/NCR 자동화",
          },
          {
            value: "f32_1_oee",
            label: "생산성·설비효율 개선",
          },
          {
            value: "f32_1_audit",
            label: "ISO 내부심사·Audit 자동화",
          },
          {
            value: "f32_1_kpi",
            label: "경영진 KPI·손실비용·납기 리스크 월간 리포트",
          },
          { value: "f32_1_etc", label: "기타", hasText: true },
        ],
      },
      {
        id: "F33",
        type: "text",
        title: "(선택) 가장 답답한 문제를 자유롭게 적어 주십시오.",
        placeholder: "자유 기입 (선택)",
        required: false,
      },
      {
        id: "F34",
        type: "single",
        title: "진단 리포트 + 전문가 무료 전화 자문(20분) 신청?",
        required: true,
        options: [
          { value: "1", label: "신청" },
          { value: "2", label: "리포트만" },
        ],
      },
    ],
  },
];

export const PAIN_LABELS: Record<string, { short: string; risk: string }> = {
  P14: {
    short: "납기·Cycle Time·병목 문제가 반복됩니다",
    risk: "납기 지연과 병목 공정 문제가 반복되면 고객 신뢰와 생산 계획 모두에 영향을 줍니다.",
  },
  P15: {
    short: "불량·CAPA 처리 부담이 큽니다",
    risk: "NCR/CAPA/8D 처리에 시간이 많이 소요되면 원인 분석과 재발 방지가 뒤로 밀리기 쉽습니다.",
  },
  P16: {
    short: "생산성·설비효율 저하가 있습니다",
    risk: "설비정지·작업대기가 잦으면 OEE가 떨어지고 개선 우선순위 판단도 어려워집니다.",
  },
  P17: {
    short: "Audit·증빙 준비 부담이 큽니다",
    risk: "Audit 준비에 man-day가 많이 들면 본업 품질 업무가 밀리고 지적사항 추적도 미흡해지기 쉽습니다.",
  },
  P18: {
    short: "데이터 분산으로 의사결정이 지연됩니다",
    risk: "생산·품질·납기 데이터가 분산되어 있으면 경영 보고와 개선 의사결정이 늦어집니다.",
  },
};
