/**
 * lib/questions.ts → docs/survey_question_list.txt + .pdf
 * 웹앱 코드와 무관 — 오프라인 문서 생성 전용
 * 실행: npm run generate:survey-list
 */
import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";
import { buildSurveyQuestionListPlainText } from "../lib/survey-print-list";

const docsDir = join(process.cwd(), "docs");
const txtPath = join(docsDir, "survey_question_list.txt");

writeFileSync(txtPath, buildSurveyQuestionListPlainText(), "utf8");
console.log(`OK: wrote ${txtPath}`);

const htmlPath = join(docsDir, "survey_question_list.html");
const text = buildSurveyQuestionListPlainText();
writeFileSync(
  htmlPath,
  `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>설문 질문지 리스트</title>
<style>
body{margin:0;padding:12px;font:11px/1.25 "Malgun Gothic",sans-serif;color:#111}
pre{margin:0;white-space:pre-wrap;word-break:break-all}
.bar{position:sticky;top:0;background:#fff;border-bottom:1px solid #ccc;padding:8px 0;margin-bottom:8px}
a{margin-right:12px}
</style></head><body>
<div class="bar"><a href="survey_question_list.pdf" download>PDF 다운로드</a><a href="survey_question_list.txt" download>TXT 다운로드</a></div>
<pre>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
</body></html>`,
  "utf8"
);
console.log(`OK: wrote ${htmlPath}`);

execSync("python scripts/render-survey-list-pdf.py", {
  cwd: process.cwd(),
  stdio: "inherit",
});
