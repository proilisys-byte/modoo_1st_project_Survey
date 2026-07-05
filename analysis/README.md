# Analysis pipeline (02_analysis_design_spec.md)

## 스모크 테스트

```bash
pip install -r analysis/requirements-smoke.txt
npm run regenerate:smoke-fixture   # export 경로로 fixture 재생성
npm run smoke:analysis             # python analysis/run_smoke.py --smoke
```

## 파이프라인 순서

`s01_quality_filter` -> `s02_scoring_validation` -> `s03_benchmark_build` -> `s04_insights`

## §6 마일스톤 게이트

| N | 구현 위치 | 기능 |
|---|-----------|------|
| 30 | `gates.py` + `s02` | 기술통계, L1 벤치마크, percentile 보류 |
| 60 | `gates.py` + `s04` | PSM 가격분석, 퍼널 소요시간 |
| 100 | `gates.py` + `s02` | 신뢰도·준거타당도·TOP3·민감도, L2 percentile |
| 150 | `gates.py` + `s02`/`s04` | EFA, 군집 페르소나 |
| 200 | `gates.py` + `s02`/`s03` | CFA, 등급 밴드, L3 세그먼트 |
| 500 | `gates.py` + `s04` | 측정동일성, 리드 스코어 보정 |

**provisional** 트리거 (`gates.py`): `n_valid < 30` 또는 `n_pool < percentile_min_n(30)`

## 산출물

- 프로덕션: `outputs/benchmarks/`, `outputs/reports/`
- 스모크: `outputs/smoke/benchmarks/*_smoke.json`, `outputs/smoke/reports/*_smoke.md`

## PII export (T-17)

`GET /api/admin/export-responses?format=jsonl|csv` — `Authorization: Bearer $ADMIN_EXPORT_SECRET`

환경변수: `ADMIN_EXPORT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`

## Supabase SQL (운영, 수동 실행)

`supabaseDB/04_survey_v2_columns.sql`, `05_c_display_order.sql`
