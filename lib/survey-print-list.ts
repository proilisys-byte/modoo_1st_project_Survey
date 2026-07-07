/**
 * lib/questions.ts → 텍스트 질문지 리스트 (웹앱 미사용, 오프라인 생성 전용)
 */
import {
  FREQ_LABELS,
  PRICE_BANDS,
  SECTIONS,
  SEV_LABELS,
  type Question,
  type ShowIfRule,
} from "./questions";
import { getQuestionDisplayLabel } from "./question-display-numbers";
import { SURVEY_VERSION } from "./survey-meta";

function showIfText(showIf: ShowIfRule): string {
  if ("and" in showIf) {
    return showIf.and.map((r) => showIfText(r)).join(" AND ");
  }
  if ("or" in showIf) {
    return showIf.or.map((r) => showIfText(r)).join(" OR ");
  }
  if ("value" in showIf) {
    return `${showIf.questionId}="${showIf.value}"일 때만`;
  }
  if ("exceptValues" in showIf) {
    return `${showIf.questionId}≠[${showIf.exceptValues.join(",")}]일 때만`;
  }
  if ("anyOf" in showIf) {
    return `${showIf.questionId}∈{${showIf.anyOf.join(",")}}일 때만`;
  }
  if ("includes" in showIf) {
    return `${showIf.questionId}에 "${showIf.includes}" 포함 시`;
  }
  if ("minIncludes" in showIf) {
    return `${showIf.questionId} ${showIf.minIncludes}개 이상 선택 시`;
  }
  if ("rankFirst" in showIf) {
    return `${showIf.questionId} 1순위="${showIf.rankFirst}"일 때만`;
  }
  if ("notValue" in showIf) {
    return `${showIf.questionId}≠"${showIf.notValue}"일 때만`;
  }
  if ("answered" in showIf) {
    return `${showIf.questionId} 응답 후`;
  }
  return "조건부";
}

function formatQuestionText(q: Question): string[] {
  const num = getQuestionDisplayLabel(q.id);
  const lines: string[] = [`${num}. ${q.title}`];

  if ("showIf" in q && q.showIf) {
    lines.push(`   (${showIfText(q.showIf)})`);
  }
  if ("note" in q && q.note) {
    lines.push(`   ※ ${q.note}`);
  }
  if (!q.required) {
    lines.push("   (선택)");
  }

  switch (q.type) {
    case "single":
      q.options.forEach((op, i) => {
        const suffix = op.hasText ? " → 기타 입력" : "";
        lines.push(`   ${String.fromCharCode(97 + i)}. ${op.label}${suffix}`);
      });
      break;
    case "multi": {
      const rule = q.exact
        ? `${q.exact}개 선택`
        : q.max
          ? `최대 ${q.max}개`
          : "복수 선택";
      lines.push(`   [${rule}]`);
      q.options.forEach((op, i) => {
        const suffix = op.hasText ? " → 기타 입력" : op.exclusive ? " (단독)" : "";
        lines.push(`   ${String.fromCharCode(97 + i)}. ${op.label}${suffix}`);
      });
      break;
    }
    case "dualScale":
      lines.push("   · 발생 빈도 (1~5)");
      FREQ_LABELS.forEach((label, i) => lines.push(`     ${i + 1}) ${label}`));
      lines.push(
        "sevOptional" in q && q.sevOptional
          ? "   · 업무 영향도 (1~5, 선택)"
          : "   · 업무 영향도 (1~5)"
      );
      SEV_LABELS.forEach((label, i) => lines.push(`     ${i + 1}) ${label}`));
      break;
    case "matrix5":
      lines.push(`   [1=${q.scaleHint.low} ~ 5=${q.scaleHint.high}]`);
      q.rows.forEach((row, i) =>
        lines.push(`   ${String.fromCharCode(97 + i)}. ${row.label}`)
      );
      break;
    case "priceMatrix":
      lines.push("   [행별 금액대 1개 선택]");
      q.rows.forEach((row, i) =>
        lines.push(`   ${String.fromCharCode(97 + i)}. ${row.label}`)
      );
      lines.push("   금액대:");
      PRICE_BANDS.forEach((band, i) => lines.push(`     ${i + 1}) ${band}`));
      break;
    case "text":
      lines.push(q.placeholder ? `   → ${q.placeholder}` : "   → 자유 기입");
      break;
    case "rank":
      lines.push("   [순위 1~4 — 각 영역에 서로 다른 순위]");
      q.items.forEach((item, i) =>
        lines.push(`   ${String.fromCharCode(97 + i)}. ${item.label}`)
      );
      break;
    case "rankPick":
      lines.push("   [1순위·2순위 — 서로 다른 보기 1개씩]");
      q.options.forEach((op, i) =>
        lines.push(`   ${String.fromCharCode(97 + i)}. ${op.label}`)
      );
      break;
    case "singleMatrix":
      lines.push("   [영역별 관리 방식 1개 선택]");
      q.rows.forEach((row) => lines.push(`   · ${row.label}`));
      q.options.forEach((op, i) =>
        lines.push(`     ${String.fromCharCode(97 + i)}. ${op.label}`)
      );
      break;
  }

  lines.push("");
  return lines;
}

/** 인쇄·PDF용 순수 텍스트 질문지 리스트 */
export function buildSurveyQuestionListPlainText(): string {
  const allQuestions = SECTIONS.flatMap((s) => s.questions);
  const lines: string[] = [
    "ISO 9001 실행력 · AI 운영혁신 준비도 무료진단",
    "설문 질문지 리스트",
    "",
    `버전: ${SURVEY_VERSION}  |  총 ${allQuestions.length}문항 (+ 연락처·동의 6항)`,
    "",
  ];

  for (const section of SECTIONS) {
    lines.push("─".repeat(60));
    lines.push(`${section.name}. ${section.heading}`);
    lines.push("─".repeat(60));
    if (section.intro) {
      lines.push("");
      lines.push(section.intro);
    }
    lines.push("");

    if (section.id === "C") {
      lines.push("[척도 기준]");
      lines.push("발생 빈도:");
      FREQ_LABELS.forEach((l, i) => lines.push(`  ${i + 1}. ${l}`));
      lines.push("업무 영향도:");
      SEV_LABELS.forEach((l, i) => lines.push(`  ${i + 1}. ${l}`));
      lines.push("");
    }

    for (const q of section.questions) {
      lines.push(...formatQuestionText(q));
    }
  }

  lines.push(
    "─".repeat(60),
    "마무리. 연락처 및 동의",
    "─".repeat(60),
    "",
    "35. 이메일 (필수)",
    "36. 회사명 (필수)",
    "37. 직책 (필수)",
    "38. 연락처 (조건부 필수)",
    "39. 진단 리포트 발송 개인정보 수집·이용 동의 (필수)",
    "40. 관련 자료 수신 동의 (선택)",
    ""
  );

  return lines.join("\n");
}
