"""§2 s01 — 데이터 품질 필터 (스모크: 플래그 + is_valid 파생)"""
from __future__ import annotations

from datetime import datetime, timezone

import pandas as pd

from common import load_yaml

PAIN_IDS = [f"C{i}" for i in range(1, 9)]


def _parse_ts(value: str | None) -> datetime | None:
    if not value:
        return None
    s = value.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _is_internal(row, cfg: dict) -> bool:
    uids = set(cfg.get("submission_uids") or [])
    uid = row.get("submission_uid")
    if uid and str(uid) in uids:
        return True
    cutoff_raw = cfg.get("created_at_lte")
    cutoff = _parse_ts(cutoff_raw) if cutoff_raw else None
    if cutoff is None:
        return False
    created = row.get("created_at")
    if created is None or (isinstance(created, float) and pd.isna(created)):
        return False
    if isinstance(created, pd.Timestamp):
        created_dt = created.to_pydatetime()
        if created_dt.tzinfo is None:
            created_dt = created_dt.replace(tzinfo=timezone.utc)
    elif isinstance(created, datetime):
        created_dt = created if created.tzinfo else created.replace(tzinfo=timezone.utc)
    else:
        created_dt = _parse_ts(str(created))
    if created_dt is None:
        return False
    return created_dt <= cutoff


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


def apply_quality_filter(df: pd.DataFrame, internal_cfg: dict | None = None) -> pd.DataFrame:
    cfg = internal_cfg or {}
    out = df.copy()
    p5 = out["duration_seconds"].quantile(0.05) if len(out) >= 5 else 180
    min_duration = max(180, p5)

    out["flag_attention"] = ~out["attention_passed"].astype(bool)
    out["flag_speeder"] = out["duration_seconds"] < min_duration
    out["flag_straightline"] = out.apply(_straightline, axis=1)
    out["flag_duplicate"] = False  # 스모크: 단일 건
    out["flag_internal"] = out.apply(lambda r: _is_internal(r, cfg), axis=1)
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
    internal_cfg = load_yaml("internal_filter.yaml")
    return apply_quality_filter(df, internal_cfg)
