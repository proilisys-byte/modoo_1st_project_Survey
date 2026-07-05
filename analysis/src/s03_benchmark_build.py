"""§4 s03 — 벤치마크 산출 (스모크: L1 중앙값, n<30 percentile 제외)"""
from __future__ import annotations

import json
from datetime import date

import pandas as pd

from common import get_run_mode, load_yaml


def run(df: pd.DataFrame, validation: dict) -> dict:
    segments = load_yaml("segments.yaml")
    mode = get_run_mode()
    pool = df[df["in_benchmark_pool"]]
    n = len(pool)
    percentile_min_n = int(segments.get("gates", {}).get("percentile_min_n", 30))
    median_min_n = int(segments.get("gates", {}).get("median_min_n", 10))
    include_percentile = n >= percentile_min_n
    include_median = n >= median_min_n

    total_stats: dict = {}
    if include_median:
        total_stats["median"] = float(pool["score"].median()) if n else None
    else:
        total_stats["insufficient_n"] = True

    benchmark = {
        "version": f"v{date.today().strftime('%Y%m%d')}",
        "window": "smoke" if mode.smoke else "production",
        "n_pool": n,
        "provisional": validation.get("provisional", False),
        "percentile_included": include_percentile,
        "median_included": include_median,
        "median_min_n": median_min_n,
        "segments": {"L1|all": {"n": n, "total": total_stats}},
    }

    out_dir = mode.outputs_root / "benchmarks"
    out_path = out_dir / mode.benchmark_name(date.today().strftime("%Y%m%d"))
    out_path.write_text(json.dumps(benchmark, ensure_ascii=False, indent=2), encoding="utf-8")
    benchmark["_path"] = str(out_path)
    return benchmark
