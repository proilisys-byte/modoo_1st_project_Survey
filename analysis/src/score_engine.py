"""lib/scoring.ts diagnose() Python 미러 — scoring_config.yaml 기준"""
from __future__ import annotations

from typing import Any

from common import load_yaml

PAIN_IDS = [f"C{i}" for i in range(1, 9)]


def _pain_score(answers: dict, qid: str) -> int | None:
    block = answers.get(qid)
    if not isinstance(block, dict):
        return None
    freq, sev = block.get("freq"), block.get("sev")
    if not isinstance(freq, (int, float)) or not isinstance(sev, (int, float)):
        return None
    return int(freq * sev)


def _single_goodness(answers: dict, qid: str, maps: dict) -> float | None:
    val = answers.get(qid)
    if not isinstance(val, str):
        return None
    qmap = maps.get(qid) or {}
    if val not in qmap:
        return None
    return float(qmap[val])


def _pain_goodness(answers: dict, qid: str) -> float | None:
    p = _pain_score(answers, qid)
    if p is None:
        return None
    return 1 - (p - 1) / 24


def _axis_score(parts: list[float | None], weight: float, missing_default: float) -> float:
    valid = [v for v in parts if v is not None]
    if not valid:
        return weight * missing_default
    return (sum(valid) / len(valid)) * weight


def diagnose_row(answers: dict[str, Any], cfg: dict | None = None) -> dict[str, Any]:
    cfg = cfg or load_yaml("scoring_config.yaml")
    sg = cfg["single_goodness"]
    missing_default = float(cfg.get("axis_missing_default", 0.5))

    domains = cfg["domains"]
    axes: list[tuple[str, float]] = []

    for key in ("d1", "d2", "d3", "d4"):
        dom = domains[key]
        weight = float(dom["weight"])
        parts: list[float | None] = []
        for item in dom["items"]:
            qk = item["question_key"]
            if item["type"] == "single":
                parts.append(_single_goodness(answers, qk, sg))
            else:
                parts.append(_pain_goodness(answers, qk))
        axes.append((key, _axis_score(parts, weight, missing_default)))

    total = round(sum(s for _, s in axes))
    pain_scores = {pid: _pain_score(answers, pid) for pid in PAIN_IDS}
    pain_scores = {k: v for k, v in pain_scores.items() if v is not None}

    return {
        "score": total,
        "d1": round(axes[0][1]),
        "d2": round(axes[1][1]),
        "d3": round(axes[2][1]),
        "d4": round(axes[3][1]),
        "pain_scores": pain_scores,
    }


def parity_check_row(row: dict, cfg: dict | None = None) -> list[str]:
    answers = row.get("answers") or {}
    computed = diagnose_row(answers, cfg)
    errors: list[str] = []
    rid = row.get("response_id", "?")
    for field in ("score", "d1", "d2", "d3", "d4"):
        expected = row.get(field)
        if expected is None:
            continue
        if int(expected) != int(computed[field]):
            errors.append(
                f"{rid} {field}: fixture={expected} computed={computed[field]}"
            )
    return errors
