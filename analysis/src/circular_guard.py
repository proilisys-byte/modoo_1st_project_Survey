"""준거타당도 순환 차단 — 준거 변수 구성에 predictor가 포함되면 assert 실패."""
from __future__ import annotations


def domain_item_keys(cfg: dict) -> dict[str, set[str]]:
    out: dict[str, set[str]] = {}
    for dk, dom in cfg.get("domains", {}).items():
        out[dk] = {it["question_key"] for it in dom.get("items", [])}
    return out


def composition_for_criterion(criterion: str, cfg: dict) -> set[str]:
    domains = domain_item_keys(cfg)
    if criterion == "total":
        comp: set[str] = set()
        for keys in domains.values():
            comp |= keys
        return comp
    if criterion in domains:
        return domains[criterion]
    return set()


def assert_no_circular_criterion(
    criterion: str,
    predictor_keys: list[str],
    cfg: dict,
) -> None:
    """준거(total/d1~d4) 구성 문항을 predictor로 쓰면 순환."""
    comp = composition_for_criterion(criterion, cfg)
    if not comp:
        return
    overlap = comp & set(predictor_keys)
    assert not overlap, (
        f"circular criterion validity: criterion={criterion!r} "
        f"shares scoring items with predictors: {sorted(overlap)}"
    )


def smoke_test_circular_guard(cfg: dict) -> None:
    """스모크: 순환 계획은 거부, 외부 준거는 허용."""
    assert_no_circular_criterion("external_audit_score", ["B2", "B4"], cfg)
    try:
        assert_no_circular_criterion("d1", ["B2", "C1"], cfg)
    except AssertionError as exc:
        if "circular criterion" not in str(exc):
            raise
    else:
        raise AssertionError("expected circular guard to reject d1 self-predictors")
    try:
        assert_no_circular_criterion("total", ["B2", "C4", "D2"], cfg)
    except AssertionError as exc:
        if "circular criterion" not in str(exc):
            raise
    else:
        raise AssertionError("expected circular guard to reject total self-predictors")
