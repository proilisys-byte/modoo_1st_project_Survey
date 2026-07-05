"""§6 표본 규모별 마일스톤 게이트 (30/60/100/150/200/500)"""
from __future__ import annotations

MILESTONES = (30, 60, 100, 150, 200, 500)


def milestone_flags(n: int) -> dict[str, bool]:
    return {str(m): n >= m for m in MILESTONES}


def resolve_gates(n_valid: int, n_pool: int, percentile_min_n: int = 30) -> dict:
    """n_valid: is_valid 표본, n_pool: in_benchmark_pool 표본."""
    flags = milestone_flags(n_valid)
    pool_flags = milestone_flags(n_pool)

    features = {
        # §6 N=30
        "s01_quality_filter": n_valid >= 1,
        "s02_descriptive_stats": n_valid >= 30,
        "s03_benchmark_l1": n_pool >= 30,
        "s03_percentile": n_pool >= percentile_min_n,
        # §6 N=60
        "s04_psm_pricing": n_valid >= 60,
        "s04_funnel_duration_copy": n_valid >= 60,
        # §6 N=100
        "s02_reliability_cronbach": n_valid >= 100,
        "s02_criterion_validity": n_valid >= 100,
        "s02_top3_convergence": n_valid >= 100,
        "s02_sensitivity": n_valid >= 100,
        "s03_benchmark_l2_percentile": n_pool >= 100,
        # §6 N=150
        "s02_efa": n_valid >= 150,
        "s04_cluster_personas": n_valid >= 150,
        # §6 N=200
        "s02_cfa": n_valid >= 200,
        "s02_grade_band_calibration": n_valid >= 200,
        "s03_benchmark_l3": n_pool >= 200,
        # §6 N=500
        "s04_measurement_invariance": n_valid >= 500,
        "s04_lead_score_calibration": n_valid >= 500,
    }

    provisional_reasons: list[str] = []
    if n_valid < 30:
        provisional_reasons.append("n_valid < 30")
    if n_pool < percentile_min_n:
        provisional_reasons.append(f"n_pool < {percentile_min_n} (percentile withheld)")

    label = "provisional" if provisional_reasons else "ok"

    return {
        "n_valid": n_valid,
        "n_pool": n_pool,
        "milestones_valid": flags,
        "milestones_pool": pool_flags,
        "features": features,
        "provisional": label == "provisional",
        "provisional_reasons": provisional_reasons,
        "label": label,
    }
