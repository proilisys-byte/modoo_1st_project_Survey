"""공통 유틸 — analysis 파이프라인"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config"
DATA_RAW = ROOT / "data" / "raw"
DATA_PROCESSED = ROOT / "data" / "processed"
OUTPUTS = ROOT / "outputs"


@dataclass
class RunMode:
    smoke: bool = False

    @property
    def outputs_root(self) -> Path:
        return OUTPUTS / "smoke" if self.smoke else OUTPUTS

    @property
    def processed_dir(self) -> Path:
        if self.smoke:
            return DATA_PROCESSED / "smoke"
        return DATA_PROCESSED

    def benchmark_name(self, date_suffix: str) -> str:
        base = f"benchmarks_v{date_suffix}"
        return f"{base}_smoke.json" if self.smoke else f"{base}.json"

    def insights_name(self, month_suffix: str) -> str:
        base = f"insights_{month_suffix}"
        return f"{base}_smoke.md" if self.smoke else f"{base}.md"

    def processed_name(self, base: str) -> str:
        return f"{base}_smoke.csv" if self.smoke else f"{base}.csv"


_RUN_MODE = RunMode()


def set_run_mode(smoke: bool = False) -> RunMode:
    global _RUN_MODE
    _RUN_MODE = RunMode(smoke=smoke)
    return _RUN_MODE


def get_run_mode() -> RunMode:
    return _RUN_MODE


def load_yaml(name: str) -> dict:
    path = CONFIG / name
    if not path.exists():
        raise FileNotFoundError(f"config missing: {path}")
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_responses(path: Path | None = None):
    import pandas as pd

    path = path or DATA_RAW / "smoke_fixture.jsonl"
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    if not rows:
        raise ValueError(f"no rows in {path}")
    return pd.DataFrame(rows)


def ensure_dirs(mode: RunMode | None = None) -> None:
    mode = mode or get_run_mode()
    mode.processed_dir.mkdir(parents=True, exist_ok=True)
    (mode.outputs_root / "benchmarks").mkdir(parents=True, exist_ok=True)
    (mode.outputs_root / "reports").mkdir(parents=True, exist_ok=True)
