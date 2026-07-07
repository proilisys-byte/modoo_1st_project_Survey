---
name: survey-analysis
description: >-
  Runs the PRO ALI SMART ISO survey analysis pipeline (s01→s04) per
  02_analysis_design_spec.md — export, quality filter, scoring validation,
  benchmarks, and monthly insights for v03 (P14–P18, Q20, F29/F30/F34).
  Use when the user asks to analyze survey results, run smoke/production
  analysis, regenerate benchmarks, validate scoring, produce insights reports,
  or mentions 설문 분석, 벤치마크, insights, question_map, analysis pipeline.
---

# Survey Analysis (ISO 실행력 · v03)

PRO ALI SMART 무료진단(`modoo_1st_project_Survey`) 응답 데이터를 **02_analysis_design_spec.md** 순서대로 분석한다.  
범용 고성능 에이전트 원칙(파일 실존 확인·끝까지 완료·코드로 계산·검증 후 완료 선언)을 따른다.

## 프로젝트 컨텍스트

| 항목 | 값 |
|------|-----|
| 프로젝트 | ISO 9001 실행력 · AI 운영혁신 준비도 무료진단 (survey.proali.kr) |
| 스택 | Next.js 15, TypeScript, Supabase, Python 3.11+ (pandas, scipy, pingouin) |
| 설문 버전 | **v03** (`lib/survey-meta.ts` → `SURVEY_VERSION = "v03"`) |
| 채점 Pain | **P14~P18** (C_ATT·Q20 이후 탐색용 제외) |
| 설계 SoT | `docs/Survey_Based_v03.md` |
| 분석 SoT | `Analysis_design_spec/02_analysis_design_spec.md` (repo 상위) |

## 에이전트 최우선 원칙 (범용 프롬프트 압축)

1. **확인하지 않은 것을 확인했다고 말하지 않는다** — export 파일·config·fixture를 읽기 전 분석 결과를 지어내지 않는다.
2. **요청은 끝까지 완료한다** — s01→s04 중단 없이 실행하고, 실패 시 원인·시도·대안을 보고한다.
3. **계산은 코드로** — 통계·집계는 Python 파이프라인 또는 스크립트 실행 결과만 인용한다. 암산·추측 금지.
4. **PII·시크릿** — `.env` 값·이메일·전화번호를 로그·리포트·커밋에 노출하지 않는다.
5. **확인 후 실행** — Supabase migration, production export, `.env` 수정, git push는 사용자 확인 후.
6. **한국어** — 리포트 본문은 한국어. 통계 용어는 설계서 표기를 따른다.

## 실행 전 체크리스트

```
- [ ] analysis/config/*.yaml 7종 존재 (run_smoke.py REQUIRED_CONFIGS)
- [ ] question_map.yaml 버전이 v03과 정합 (legacy v2면 갱신 작업 선행)
- [ ] scoring_config.yaml ↔ lib/scoring.ts parity (parity_report 확인)
- [ ] harmonize.yaml에 v1/v2/v03 매핑 반영 여부
- [ ] smoke: analysis/data/raw/smoke_fixture.jsonl 존재 (스모크 시)
- [ ] production: export jsonl/csv → analysis/data/raw/ 배치 (운영 시)
```

v03 미반영 config로 production 분석을 돌리면 **중단하고** 갱신 범위를 보고한다. 스모크만 허용.

## 워크플로

### A. 스모크 (로컬·CI — 확인 없이 실행)

```bash
cd modoo_1st_project_Survey
pip install -r analysis/requirements-smoke.txt
npm run regenerate:smoke-fixture   # 필요 시
npm run smoke:analysis             # python analysis/run_smoke.py --smoke
```

성공 기준: exit 0, `analysis/outputs/smoke/reports/insights_*_smoke.md` 생성.

### B. 프로덕션 (응답 export 후)

1. **Export** — Admin API 또는 Supabase service role로 PII 제외 export  
   `GET /api/admin/export-responses?format=jsonl` (+ `ADMIN_EXPORT_SECRET`)  
2. **배치** — `analysis/data/raw/responses_YYYYMMDD.jsonl`  
3. **실행** — `python analysis/run_smoke.py` (또는 production 모드 플래그가 있으면 해당 진입점)  
4. **순서 고정** — `s01 → s02 → s03 → s04` (s02 실패 도메인은 s03에 `provisional` 라벨)

### C. 파이프라인 단계

| 단계 | 모듈 | 산출 |
|------|------|------|
| s01 | `s01_quality_filter.py` | `is_valid`, `in_benchmark_pool`, 플래그(R1~R6) |
| s02 | `s02_scoring_validation.py` | 기술통계, α, 준거 타당도, TOP3 수렴, 민감도 |
| s03 | `s03_benchmark_build.py` | `outputs/benchmarks/benchmarks_vYYYYMMDD.json` |
| s04 | `s04_insights.py` | `outputs/reports/insights_YYYYMM.md`, validation 리포트 |

게이트 로직: `analysis/src/gates.py` — **표본 N에 따라 기능 on/off**.

## 표본 마일스톤 (§6)

| N (유효) | 활성화 |
|----------|--------|
| **30** | s01, 기술통계, L1 벤치마크 (백분위 미표기) |
| **60** | F30 PSM, 퍼널·소요시간 |
| **100** | 신뢰도, 준거 타당도, TOP3 수렴, L2 percentile |
| **150** | EFA, 군집 페르소나 |
| **200** | CFA, 등급 밴드, L3 세그먼트 |
| **500** | 측정동일성, 리드 스코어 학습 보정 |

`n_valid < 30` 또는 `n_pool < 30` → **`provisional: true`** — 대외 벤치마크·백분위 표기 보류.

## v03 분석 포인트

- **Pain IPA (§5.2)** — 8항목→**5항목(P14~P18)** 빈도·영향 중앙값 산점
- **TOP3** — computed burden TOP3 (P14~P18); Q20 자가순위와 **수렴 검증**(§3.5), Q20는 탐색 교차용
- **PSM** — `F30` + `flag_psm` 제외; n≥60
- **리드 스코어** — F29/F34/A6 등 v03 키로 §5.5 룰 매핑 확인
- **교차분석** — `docs/Survey_Based_v03.md` §5 (Q20×Q20-1, F32×F30 등)

## insights 리포트 구조 (s04)

```markdown
# Insights YYYY-MM

## 메타
survey_version / scoring_config_version / benchmark_version / data_extracted_at
n_valid / n_benchmark_pool / provisional

## 1. 표본·품질 (s01)
필터별 탈락률, attention_passed 비율

## 2. 채점·분포 (s02, N 게이트 충족 시)
도메인·총점, 신뢰도·준거(해당 N)

## 3. 벤치마크 (s03)
세그먼트별 median/p25/p75, 비교 기준 문구

## 4. 인사이트 (s04)
IPA, 사전등록 가설(H1~H5, FDR), PSM, 페르소나(N≥150)

## 5. v03 사업 시사 (탐색)
Q20·Pain·WTP 교차 — 인과 표현 금지

## 6. 다음 액션
config/문항 개정 후보, 추가 표본 필요 N
```

## v03 config 갱신 (선행 작업이 필요할 때)

1. `npm run generate:question-map` — `lib/questions-v03-sections.ts` 기준
2. `npm run regenerate:smoke-fixture`
3. `analysis/config/harmonize.yaml` — v03 keys
4. `s02` TOP3·준거 변수 — C1~C8/Q24 참조 제거, P14~P18/Q20 반영
5. `npm run smoke:analysis` + `npm run verify:scoring` 통과 확인

한 번에 하나의 atomic 목표로 커밋. 범위 넘어가는 리팩터 금지.

## 완료 선언 조건

아래 **모두** 충족 시에만 "분석 완료":

1. 파이프라인 명령 exit 0
2. 산출물 파일 경로를 사용자에게 명시
3. 리포트 헤더에 버전·N·provisional 기록
4. N 미달로 비활성화된 § 기능을 목록으로 보고
5. v03 config 미정합이 있었으면 **제한 사항** 명시 (스모크 only 등)

## 막혔을 때

| 상황 | 조치 |
|------|------|
| question_map v2 vs web v03 | § v03 config 갱신 선행 |
| parity 실패 | `lib/scoring.ts` vs `scoring_config.yaml` diff, `parity_report` |
| fixture 없음 | `npm run regenerate:smoke-fixture` |
| export 401 | `ADMIN_EXPORT_SECRET` — 사용자에게 확인 요청 |
| Python deps | `pip install -r analysis/requirements-smoke.txt` |

## 추가 참고

- 상세 경로·v02↔v03 매핑·대외 금지: [reference.md](reference.md)
- CLAUDE.md 행동 규칙: repo 상위 `CLAUDE.md` (프로젝트 정보는 본 skill 표 참조)
