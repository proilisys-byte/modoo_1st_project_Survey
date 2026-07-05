"""§2 s01 — 데이터 품질 필터 (스모크: 플래그 + is_valid 파생)"""
from __future__ import annotations

import pandas as pd

PAIN_IDS = [f"C{i}" for i in range(1, 9)]


def _straightline(row) -> bool:
    answers = row.get("answers") or {}
    freqs, sevs = [], []
    for pid in PAIN_IDS:
        block = answers.get(pid)
        if isinstance(block, dict):
            if isinstance(block.get("freq"), (int, float)):
                freqs.append(block["freq"])
            if isinstance(block.get("sev"), (int, float)):
                sevs.append(block["sev"])
    if len(freqs) < 7 or len(sevs) < 7:
        return False
    return len(set(freqs)) == 1 and len(set(sevs)) == 1


def apply_quality_filter(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    p5 = out["duration_seconds"].quantile(0.05) if len(out) >= 5 else 180
    min_duration = max(180, p5)

    out["flag_attention"] = ~out["attention_passed"].astype(bool)
    out["flag_speeder"] = out["duration_seconds"] < min_duration
    out["flag_straightline"] = out.apply(_straightline, axis=1)
    out["flag_duplicate"] = False  # 스모크: 단일 건
    out["flag_internal"] = False
    out["flag_psm"] = out["psm_inconsistent"].astype(bool)

    out["is_valid"] = ~(
        out["flag_attention"]
        | out["flag_speeder"]
        | out["flag_straightline"]
        | out["flag_internal"]
    )
    out["in_benchmark_pool"] = out["is_valid"] & ~out["flag_duplicate"]
    return out


def run(df: pd.DataFrame) -> pd.DataFrame:
    return apply_quality_filter(df)
