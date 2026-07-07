# Survey Analysis — Reference

## 설계·코드 경로

| 문서/코드 | 경로 |
|-----------|------|
| 분석 설계서 (SoT) | `e:\0000_Modoo_1st_Project\Analysis_design_spec\02_analysis_design_spec.md` |
| 설문 v03 설계 | `docs/Survey_Based_v03.md` |
| 분석 README | `analysis/README.md` |
| 파이프라인 진입점 | `analysis/run_smoke.py` |
| 게이트 | `analysis/src/gates.py` |

## v02 → v03 문항 ID (분석 갱신 시 필수)

| v02 (legacy) | v03 (현행 웹) | 비고 |
|--------------|---------------|------|
| C1~C8 | P14~P18 | Pain 8→5, 채점·TOP3 대상 |
| C9 TOP3 | Q20 (1·2순위) | 탐색용, 채점 제외 |
| C_ATT | C_ATT | attention_passed |
| D2, F0-Q1~3 | E25 (singleMatrix) | IT 현황 3행 |
| E1 (6행) | F27 (3행) | 기능 matrix5 |
| E2, F5-1 | F28 (exact 3) | 장애 TOP3 |
| E3, E3-1 | F29, F29-1 | PoC |
| E4 | F30 | Van Westendorp |
| E5 | F31 | PoC 비용 |
| E6 | F34 | 무료 자문 신청 |
| E5A | F33 | 자유응답 |
| B5 | (삭제) | v03 미사용 |

`question_map.yaml`·`harmonize.yaml`·`smoke_fixture.jsonl`·s02 TOP3 수렴 로직은 v03 반영 전까지 **legacy 가정**일 수 있음. 분석 실행 전 diff 확인.

## v03 사업 교차분석 (s04 확장 시)

| 교차 | keys | 의사결정 |
|------|------|----------|
| Pain 메시지 | Q20.first × Q20-1 | 랜딩·PoC 훅 |
| MVP 스택 | Q20.first × Q20-2 | ERP/MES/SaaS |
| 점수 정합 | P14~P18 burden × Q20.first | ISO + 사업 1순위 |
| WTP | F32 × F30 | 가격 밴드 |
| 영업 타겟 | A6-1 × F29-2 | self-serve vs enterprise |
| PoC 배포 | E25-3 × E26 | 온프레 vs SaaS |

## 산출물 헤더 (§7 재현성)

모든 리포트·JSON 상단:

```yaml
survey_version: v03
scoring_config_version: <lib/scoring-config>
benchmark_version: vYYYYMMDD
data_extracted_at: ISO8601
n_valid: N
n_benchmark_pool: M
provisional: true|false  # n_valid<30 or n_pool<30
```

## 대외 표현 금지 (§7)

- "업계 평균" 단정 금지 → "본 진단 응답 N개사 기준"
- 인과 주장 금지 → "연관"
- Q31/F27 절대 수요 근거 금지 → 항목 간 **상대 순위**만
- 벤치마크 셀 n<10 대외 미공개

## Admin export (PII 분리)

```
GET /api/admin/export-responses?format=jsonl|csv
Authorization: Bearer $ADMIN_EXPORT_SECRET
```

환경변수: `ADMIN_EXPORT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`  
분석용 raw는 PII 제외 필드만 (`field_mapping.yaml`).
