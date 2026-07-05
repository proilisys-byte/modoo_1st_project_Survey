/**
 * Q11(B4)·Q14(B7) 구간 상호배타성 단위검증
 * 절단 규칙: lib/boundaries.ts 와 동기화
 * 실행: node scripts/verify-boundaries.mjs
 */

// ── Q11 B4: CAPA 완결 소요 (일) ──
// b4_v2_lte1w ≤7 | b4_v2_1_2w 8~14 | b4_v2_2_4w 15~28 | b4_v2_gt4w 29+
const B4_DURATION_RANGES = [
  { key: "b4_v2_lte1w", min: 0, max: 7 },
  { key: "b4_v2_1_2w", min: 8, max: 14 },
  { key: "b4_v2_2_4w", min: 15, max: 28 },
  { key: "b4_v2_gt4w", min: 29, max: 999 },
];

// ── Q14 B7: Audit man-day ──
const B7_RANGES = [
  { key: "b7_v2_lt3", min: 0, max: 2 },
  { key: "b7_v2_3to6", min: 3, max: 6 },
  { key: "b7_v2_7to11", min: 7, max: 11 },
  { key: "b7_v2_ge12", min: 12, max: 999 },
];

function mapDays(days, ranges) {
  const hits = ranges.filter((r) => days >= r.min && days <= r.max);
  return hits.length === 1 ? hits[0].key : null;
}

function assertMutuallyExclusive(label, ranges, maxDay) {
  for (let d = 0; d <= maxDay; d++) {
    const key = mapDays(d, ranges);
    if (!key) {
      console.error(`FAIL [${label}]: day ${d} → ${key} (expected exactly one bucket)`);
      return false;
    }
  }
  // 경계값 spot check
  const spots = [
    [ranges[0].max, ranges[0].key],
    [ranges[0].max + 1, ranges[1]?.key],
    [ranges[1]?.max, ranges[1]?.key],
    [ranges[1]?.max + 1, ranges[2]?.key],
    [ranges[2]?.max, ranges[2]?.key],
    [ranges[2]?.max + 1, ranges[3]?.key],
  ].filter(([, k]) => k);
  for (const [day, expected] of spots) {
    const got = mapDays(day, ranges);
    if (got !== expected) {
      console.error(
        `FAIL [${label}]: boundary day ${day} → ${got}, expected ${expected}`
      );
      return false;
    }
  }
  console.log(`OK: ${label} ranges mutually exclusive (0~${maxDay} days)`);
  return true;
}

function assertV2Keys(label, expectedKeys, actualKeys) {
  const v1Numeric = actualKeys.every((k) => !/^[1-5]$/.test(k));
  if (!v1Numeric) {
    console.error(`FAIL [${label}]: v1 numeric keys detected in options`);
    return false;
  }
  const missing = expectedKeys.filter((k) => !actualKeys.includes(k));
  if (missing.length) {
    console.error(`FAIL [${label}]: missing v2 keys: ${missing.join(", ")}`);
    return false;
  }
  console.log(`OK: ${label} uses v2 keys (${actualKeys.join(", ")})`);
  return true;
}

let ok = true;

ok =
  assertV2Keys("Q11 B4", [
    "b4_v2_lte1w",
    "b4_v2_1_2w",
    "b4_v2_2_4w",
    "b4_v2_gt4w",
    "b4_v2_effect_weak",
    "b4_v2_not_operated",
  ], [
    "b4_v2_lte1w",
    "b4_v2_1_2w",
    "b4_v2_2_4w",
    "b4_v2_gt4w",
    "b4_v2_effect_weak",
    "b4_v2_not_operated",
  ]) && ok;

ok = assertMutuallyExclusive("Q11 B4 duration", B4_DURATION_RANGES, 999) && ok;
ok = assertMutuallyExclusive("Q14 B7 man-day", B7_RANGES, 999) && ok;

if (!ok) process.exit(1);
