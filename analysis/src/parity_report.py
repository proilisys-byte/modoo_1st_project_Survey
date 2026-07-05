"""lib/scoring.ts vs scoring_config.yaml 구조 diff (채점 동일성 확인용)"""
from __future__ import annotations

# lib/scoring.ts diagnose() axes — 단일 소스 기준 (코드에서 추출)
TS_DOMAINS: dict[str, list[tuple[str, str, float]]] = {
    "d1": [
        ("B2", "single", 30),
        ("C1", "pain", 30),
        ("C2", "pain", 30),
        ("C5", "pain", 30),
    ],
    "d2": [
        ("B4", "single", 30),
        ("B5", "single", 30),
        ("B6", "single", 30),
        ("C4", "pain", 30),
        ("C6", "pain", 30),
    ],
    "d3": [
        ("C3", "pain", 20),
        ("C8", "pain", 20),
    ],
    "d4": [
        ("B3", "single", 20),
        ("B7", "single", 20),
        ("C7", "pain", 20),
        ("D2", "single", 20),
    ],
}

DOC_SPEC_ESTIMATE: dict[str, list[str]] = {
    "d1": ["Q15", "Q16", "Q20", "Q8"],
    "d2": ["Q11", "Q12", "Q13", "Q21"],
    "d3": ["Q17", "Q18", "Q23"],
    "d4": ["Q22", "Q9", "Q10", "Q13", "Q26"],
}


def print_parity_table(cfg: dict) -> None:
    print("")
    print("=== scoring_config.yaml vs lib/scoring.ts (domain items) ===")
    print(f"{'domain':<6} {'#':<3} {'yaml_key':<8} {'ts_key':<8} {'type':<8} {'weight':<8} {'match':<6}")
    print("-" * 60)
    all_match = True
    for dkey in ("d1", "d2", "d3", "d4"):
        yaml_items = cfg["domains"][dkey]["items"]
        ts_items = TS_DOMAINS[dkey]
        weight = cfg["domains"][dkey]["weight"]
        for i, (ts_q, ts_type, ts_w) in enumerate(ts_items):
            y = yaml_items[i]
            yk = y["question_key"]
            yt = y["type"]
            ok = yk == ts_q and yt == ts_type and weight == ts_w
            if not ok:
                all_match = False
            print(
                f"{dkey:<6} {i+1:<3} {yk:<8} {ts_q:<8} {yt:<8} {weight:<8} {'OK' if ok else 'DIFF':<6}"
            )
    print("")
    print("=== document estimate vs code (informational - yaml follows code) ===")
    print(f"{'domain':<6} {'doc_spec_estimate':<40} {'code_keys'}")
    print("-" * 80)
    for dkey in ("d1", "d2", "d3", "d4"):
        code_keys = [x[0] for x in TS_DOMAINS[dkey]]
        doc = ", ".join(DOC_SPEC_ESTIMATE[dkey])
        print(f"{dkey:<6} {doc:<40} {', '.join(code_keys)}")
    print("")
    if all_match:
        print("OK: yaml domain mapping matches lib/scoring.ts")
    else:
        print("FAIL: yaml domain mapping differs from lib/scoring.ts")
    return None if all_match else "domain mismatch"
