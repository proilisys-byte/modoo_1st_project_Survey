"""§3 s02 — 채점 검증 (스모크: 설정 로드 + 기술통계 + §6 게이트)"""
from __future__ import annotations

import pandas as pd

from common import load_yaml
from gates import resolve_gates


def run(df: pd.DataFrame) -> dict:
    cfg = load_yaml("scoring_config.yaml")
    segments = load_yaml("segments.yaml")
    valid = df[df["is_valid"]]
    pool = df[df["in_benchmark_pool"]]
    n_valid = len(valid)
    n_pool = len(pool)
    percentile_min_n = int(segments.get("gates", {}).get("percentile_min_n", 30))

    gate = resolve_gates(n_valid, n_pool, percentile_min_n)

    summary = {
        "scoring_config_version": cfg["version"],
        "n_valid": n_valid,
        "n_pool": n_pool,
        "n_total": len(df),
        "score_median": float(valid["score"].median()) if n_valid else None,
        "score_min": int(valid["score"].min()) if n_valid else None,
        "score_max": int(valid["score"].max()) if n_valid else None,
        "domains_defined": list(cfg["domains"].keys()),
        "validation_passed": n_valid >= 1,
        "label": gate["label"],
        "provisional": gate["provisional"],
        "provisional_reasons": gate["provisional_reasons"],
        "gates": gate,
    }
    return summary
