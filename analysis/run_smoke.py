#!/usr/bin/env python3

"""

02_analysis_design_spec.md 스모크 테스트

s01 -> s02 -> s03 -> s04 순서 실행, PII 없는 fixture 사용.



Usage:

  pip install -r analysis/requirements-smoke.txt

  python analysis/run_smoke.py --smoke

"""

from __future__ import annotations



import argparse

import sys

from pathlib import Path



SRC = Path(__file__).resolve().parent / "src"

sys.path.insert(0, str(SRC))



from common import CONFIG, DATA_RAW, ensure_dirs, get_run_mode, load_responses, load_yaml, set_run_mode  # noqa: E402

import s01_quality_filter as s01  # noqa: E402

import s02_scoring_validation as s02  # noqa: E402

import s03_benchmark_build as s03  # noqa: E402

import s04_insights as s04  # noqa: E402

from parity_report import print_parity_table  # noqa: E402

from score_engine import parity_check_row  # noqa: E402



REQUIRED_CONFIGS = [

    "scoring_config.yaml",

    "segments.yaml",

    "grade_bands.yaml",

    "harmonize.yaml",

    "field_mapping.yaml",

]





def check_layout() -> None:

    missing = [c for c in REQUIRED_CONFIGS if not (CONFIG / c).exists()]

    if missing:

        raise SystemExit(f"FAIL: missing config - {missing}")

    fixture = DATA_RAW / "smoke_fixture.jsonl"

    if not fixture.exists():

        raise SystemExit(f"FAIL: missing fixture - {fixture}")

    for name in REQUIRED_CONFIGS:

        load_yaml(name)

    print("OK: layout + configs loadable")





def run_parity_check(cfg: dict) -> None:

    print_parity_table(cfg)

    df = load_responses()

    errors: list[str] = []

    for row in df.to_dict(orient="records"):

        errors.extend(parity_check_row(row, cfg))

    if errors:

        print("FAIL: scoring parity check")

        for e in errors:

            print(f"  - {e}")

        raise SystemExit(1)

    print(f"OK: scoring parity - {len(df)} fixture rows match yaml recomputation")





def main() -> int:

    parser = argparse.ArgumentParser(description="Analysis pipeline smoke test")

    parser.add_argument(

        "--smoke",

        action="store_true",

        help="Write outputs under outputs/smoke/ with _smoke suffix",

    )

    args = parser.parse_args()

    set_run_mode(smoke=True)

    mode = get_run_mode()



    print("=== analysis smoke test (02_analysis_design_spec.md) ===")

    if mode.smoke:

        print("mode: smoke (outputs/smoke/, *_smoke artifacts)")



    check_layout()

    cfg = load_yaml("scoring_config.yaml")

    run_parity_check(cfg)

    ensure_dirs(mode)



    df = load_responses()

    print(f"OK: loaded {len(df)} fixture rows (PII-free)")



    df = s01.run(df)

    processed_path = mode.processed_dir / mode.processed_name("processed")

    df.to_csv(processed_path, index=False)

    print(f"OK: s01 quality filter - valid={df['is_valid'].sum()} / {len(df)}")



    validation = s02.run(df)

    if not validation["validation_passed"]:

        print("FAIL: s02 validation")

        return 1

    print(

        f"OK: s02 scoring validation - n_valid={validation['n_valid']} "

        f"median={validation['score_median']} label={validation['label']}"

    )

    if validation.get("provisional_reasons"):

        print(f"    provisional: {validation['provisional_reasons']}")



    benchmark = s03.run(df, validation)

    pct_keys = list(benchmark["segments"]["L1|all"]["total"].keys())

    if validation["n_pool"] < 30 and "percentile" in pct_keys:

        print("FAIL: percentile present in benchmark when n_pool < 30")

        return 1

    print(f"OK: s03 benchmark - n_pool={benchmark['n_pool']} keys={pct_keys} -> {benchmark['_path']}")



    report_path = s04.run(df, validation, benchmark)

    print(f"OK: s04 insights -> {report_path}")



    print("=== smoke test PASSED ===")

    return 0





if __name__ == "__main__":

    raise SystemExit(main())

