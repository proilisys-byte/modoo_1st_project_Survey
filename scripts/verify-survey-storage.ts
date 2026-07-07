/**
 * localStorage 진행 상태 — survey/scoring 버전 불일치 시 폐기
 * 실행: npm run verify:storage
 */
import {
  clearSavedState,
  isSavedStateVersionValid,
  readSavedState,
  STORAGE_KEY,
  writeSavedState,
  type SavedState,
} from "../lib/survey-storage";
import { SCORING_CONFIG_VERSION, SURVEY_VERSION } from "../lib/survey-meta";

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

const base: SavedState = {
  survey_version: SURVEY_VERSION,
  scoring_config_version: SCORING_CONFIG_VERSION,
  step: 2,
  answers: { B2: "3" },
  startedAt: Date.now(),
  contact: {
    email: "",
    name: "",
    company: "",
    jobTitle: "",
    phone: "",
    consentRequired: false,
    marketingOptIn: false,
  },
  displayOrder: null,
};

assert(isSavedStateVersionValid(base), "current version must be valid");

assert(
  !isSavedStateVersionValid({ ...base, survey_version: "v1" }),
  "v1 survey_version must be invalid"
);
assert(
  !isSavedStateVersionValid({ ...base, scoring_config_version: "v1" }),
  "v1 scoring_config_version must be invalid"
);
assert(!isSavedStateVersionValid(null), "null must be invalid");
assert(
  !isSavedStateVersionValid({ step: 2 }),
  "missing version fields must be invalid"
);

const store = new Map<string, string>();
const g = globalThis as typeof globalThis & {
  localStorage?: Storage;
};

const mockStorage: Storage = {
  get length() {
    return store.size;
  },
  clear() {
    store.clear();
  },
  getItem(key: string) {
    return store.get(key) ?? null;
  },
  setItem(key: string, value: string) {
    store.set(key, value);
  },
  removeItem(key: string) {
    store.delete(key);
  },
  key(index: number) {
    return [...store.keys()][index] ?? null;
  },
};

g.localStorage = mockStorage;

writeSavedState({
  step: 3,
  answers: { A1: "1" },
  startedAt: 123,
  contact: base.contact,
  displayOrder: null,
});
const loaded = readSavedState();
assert(loaded?.step === 3, "write/read roundtrip");
assert(loaded?.survey_version === SURVEY_VERSION, "persisted survey_version");
assert(
  loaded?.scoring_config_version === SCORING_CONFIG_VERSION,
  "persisted scoring_config_version"
);

store.set(
  STORAGE_KEY,
  JSON.stringify({ ...base, survey_version: "v1", step: 5 })
);
assert(readSavedState() === null, "v1 blob must be discarded");
assert(!store.has(STORAGE_KEY), "discarded blob must be removed from storage");

store.set(
  STORAGE_KEY,
  JSON.stringify({ ...base, scoring_config_version: "v1", step: 5 })
);
assert(readSavedState() === null, "v1 scoring blob must be discarded");

clearSavedState();
assert(readSavedState() === null, "clear removes state");

console.log("OK: survey storage version gate — current valid");
console.log("OK: survey storage version gate — v1 survey discarded");
console.log("OK: survey storage version gate — v1 scoring discarded");
console.log("OK: survey storage write/read includes version fields");
