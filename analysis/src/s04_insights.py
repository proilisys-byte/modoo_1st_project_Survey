"""§5 s04 — 인사이트 (스모크: 요약 리포트 + §6 게이트 요약)"""
from __future__ import annotations

from datetime import date

import pandas as pd

from common import get_run_mode


def run(df: pd.DataFrame, validation: dict, benchmark: dict) -> str:
    mode = get_run_mode()
    valid_n = int(df["is_valid"].sum())
    flag_rates = {
        "attention": float(df["flag_attention"].mean()),
        "speeder": float(df["flag_speeder"].mean()),
        "straightline": float(df["flag_straightline"].mean()),
        "psm": float(df["flag_psm"].mean()),
    }
    gates = validation.get("gates", {})
    features = gates.get("features", {})

    lines = [
        f"# Insights smoke report - {date.today().isoformat()}",
        "",
        f"- Valid responses: {valid_n} / {len(df)}",
        f"- Scoring validation: {validation.get('label', 'n/a')}",
        f"- Provisional reasons: {', '.join(validation.get('provisional_reasons', [])) or 'none'}",
        f"- Benchmark pool n: {benchmark.get('n_pool', 0)}",
        f"- Median in benchmark JSON: {benchmark.get('median_included', False)}",
        f"- Percentile in benchmark JSON: {benchmark.get('percentile_included', False)}",
        "",
        "## §6 milestone gates (n_valid)",
        *[
            f"- N>={m}: {'yes' if gates.get('milestones_valid', {}).get(str(m)) else 'no'}"
            for m in (30, 60, 100, 150, 200, 500)
        ],
        "",
        "## Active features at current n",
        *[f"- {k}: {v}" for k, v in sorted(features.items()) if v],
        "",
        "## Filter flag rates",
        *[f"- {k}: {v:.1%}" for k, v in flag_rates.items()],
        "",
        "_Smoke test artifact - full analysis requires N>=30+._",
    ]
    text = "\n".join(lines)
    out_path = mode.outputs_root / "reports" / mode.insights_name(date.today().strftime("%Y%m"))
    out_path.write_text(text, encoding="utf-8")
    return str(out_path)
