/**
 * lib/questions.ts → analysis/config/question_map.yaml
 * 실행: npx tsx scripts/generate-question-map.ts
 *
 * spec_q: docs/01 (PRO_ALI_SMART_설문조사_설계서.md) 표시 순서 Q1~Q37 + 보조키
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { SECTIONS, type Question } from "../lib/questions";

/** 설계서·parity_report 교차 확인된 spec Q (비연속 번호 포함) */
const SPEC_Q_OVERRIDE: Record<string, string> = {
  A1: "Q1",
  A2: "Q2",
  A3: "Q3",
  A4: "Q4",
  A5: "Q5",
  A6: "Q6",
  B1: "Q7",
  B2: "Q8",
  B3: "Q9",
  B3A: "Q10",
  q10_basis: "Q10-aux",
  B4: "Q11",
  B5: "Q12",
  B6: "Q13",
  B7: "Q14",
  C1: "Q15",
  C2: "Q16",
  C3: "Q17",
  C4: "Q18",
  C5: "Q19",
  C6: "Q20",
  C7: "Q21",
  C8: "Q22",
  C_ATT: "ATT",
  C9: "Q23",
  D1: "Q24",
  D2: "Q25",
  D2A: "Q26",
  D3: "Q27",
  D4_gate: "Q28",
  D4_pain: "Q29",
  D5: "Q30",
  E1: "Q31",
  E2: "Q32",
  E3: "Q33",
  E4: "Q34",
  E5: "Q35",
  E5A: "Q35-aux",
  E6: "Q36",
};

const E1_ROW_SPEC: Record<string, { sub: string; note: string }> = {
  a: { sub: "Q31a", note: "ISO 조항 → 우리 회사 맞춤 일일 체크시트 자동 변환" },
  b: { sub: "Q31b", note: "부적합 발생 시 CAPA/8D 보고서 초안 자동 작성" },
  c: { sub: "Q31c", note: "불량 원인의 발생 단계(개발/제조/검사/출하) 추적" },
  d: { sub: "Q31d", note: "부서별 시정조치 담당·기한 할당 및 진행 알림" },
  e: {
    sub: "Q31e",
    note: "v2 추가 — 경영진용 품질 리스크·손실비용 월간 리포트 자동 생성 (설계서 v1 4행 대비 +2)",
  },
  f: {
    sub: "Q31f",
    note: "v2 추가 — 내부심사·고객 Audit 대비 문서·기록 자동 점검 (설계서 v1 4행 대비 +2)",
  },
};

const V2_ONLY = new Set(["B3A", "D2A", "E5A", "q10_basis"]);

type MapEntry = {
  key: string;
  spec_q: string;
  section: string;
  type: string;
  title: string;
  required: boolean;
  parent_key?: string;
  spec_note?: string;
};

function entriesForQuestion(q: Question, sectionId: string): MapEntry[] {
  const base: MapEntry = {
    key: q.id,
    spec_q: SPEC_Q_OVERRIDE[q.id] ?? q.id,
    section: sectionId,
    type: q.type,
    title: q.title,
    required: q.required,
  };
  if (V2_ONLY.has(q.id)) {
    base.spec_note = "v2 추가 문항 (설계서 v1 미포함)";
  }
  if (q.id === "C_ATT") {
    base.spec_note = "주의 확인 문항 — 채점·TOP3 제외, sev 선택";
  }
  if (q.id === "C9") {
    base.spec_note = "자가 TOP3 선택 — 채점 제외, answers JSON만 저장";
  }

  const out: MapEntry[] = [base];

  if (q.type === "matrix5") {
    for (const row of q.rows) {
      const meta = E1_ROW_SPEC[row.id];
      out.push({
        key: `${q.id}.${row.id}`,
        parent_key: q.id,
        spec_q: meta?.sub ?? `${q.id}.${row.id}`,
        section: sectionId,
        type: "matrix5_row",
        title: row.label,
        required: q.required,
        spec_note: meta?.note,
      });
    }
  }
  if (q.type === "priceMatrix") {
    for (const row of q.rows) {
      out.push({
        key: `${q.id}.${row.id}`,
        parent_key: q.id,
        spec_q: `${SPEC_Q_OVERRIDE[q.id] ?? q.id}${row.id}`,
        section: sectionId,
        type: "priceMatrix_row",
        title: row.label,
        required: q.required,
      });
    }
  }

  return out;
}

const questions: MapEntry[] = [];
for (const section of SECTIONS) {
  for (const q of section.questions) {
    questions.push(...entriesForQuestion(q, section.id));
  }
}

const yaml = `# lib/questions.ts ↔ docs/01 (PRO_ALI_SMART_설문조사_설계서.md)
# generated: ${new Date().toISOString().slice(0, 10)} — npm run generate:question-map
version: v2
source: lib/questions.ts

questions:
${questions
  .map((e) => {
    const lines = [
      `  - key: ${e.key}`,
      `    spec_q: ${e.spec_q}`,
      `    section: ${e.section}`,
      `    type: ${e.type}`,
      `    required: ${e.required}`,
      `    title: ${JSON.stringify(e.title)}`,
    ];
    if (e.parent_key) lines.push(`    parent_key: ${e.parent_key}`);
    if (e.spec_note) lines.push(`    spec_note: ${JSON.stringify(e.spec_note)}`);
    return lines.join("\n");
  })
  .join("\n")}
`;

const outPath = join(process.cwd(), "analysis/config/question_map.yaml");
writeFileSync(outPath, yaml, "utf8");
console.log(`OK: wrote ${questions.length} entries -> ${outPath}`);
