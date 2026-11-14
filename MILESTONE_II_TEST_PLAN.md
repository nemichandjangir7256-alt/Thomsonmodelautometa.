# CSET302 Milestone-II Verification

**Project:** Thompson Automata Studio
**Topic:** Regular Expression to ε-NFA using Thompson's Construction
**Group:** Group 1
**Verification date:** 14 November 2026

## 1. Verification summary

The final verification used the repository's Vitest suites, a dedicated final verification matrix, TypeScript compilation, a Vite production build, and browser checks against the running application.

| Check | Result |
|---|---|
| Dependency installation (`npm ci`) | Completed; npm reported 5 audit findings |
| Automated tests | 304 passed across 11 test files |
| TypeScript check | Passed |
| Production build | Passed |
| Lint | Not configured in `package.json` |
| Browser verification | Passed for the documented application flows |

## 2. Construction and parsing coverage

The test suites cover symbols, epsilon aliases (`E` and `ε`), grouping, concatenation, union, Kleene star, operator precedence, nested expressions, malformed expressions, and unsupported operators. Construction tests verify state counts, transition counts, unique state IDs, valid transition endpoints, the start state, and the accepting state.

The final matrix includes:

`a`, `b`, `E`, `ε`, `ab`, `a|b`, `a*`, `(ab)`, `(a|b)*`, `(a|b)*abb`, and `((a|b)*)*`.

## 3. Simulation coverage

For `(a|b)*abb`, the verified cases were:

| Input | Expected |
|---|---|
| `abb` | Accept |
| `aabb` | Accept |
| `babb` | Accept |
| `bbabb` | Accept |
| `ab` | Reject |
| `aab` | Reject |
| `ba` | Reject |
| `aba` | Reject |
| `bbb` | Reject |
| Empty input | Reject |

Additional cases cover empty input with `a*` and `a|b`, repeated input with `a*`, `ab`, `(a|b)*`, nested stars, unsupported input, early dead paths, and strings that reach an accepting state before all input is consumed.

## 4. Step tracer and graph coverage

The browser verification checked initial ε-closure, active states before and after each symbol, matching transitions, ε-closure highlighting, multiple active paths, selected-step navigation, animated transitions, execution summaries, the transition table, graph zoom/pan controls, and Reset layout.

The graph adapter has a regression test for multi-hop ε-closure highlighting. Layout coordinates are generated when an automaton is created and remain unchanged while trace highlighting changes.

## 5. Evidence

Command output is stored in `submission/test-results/`. Browser screenshots are stored in `submission/screenshots/`. The technical report is available in `submission/report/`.
