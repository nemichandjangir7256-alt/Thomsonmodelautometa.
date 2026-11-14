# Thompson Automata Studio — Project Specification

> **Version:** 1.0 — Milestone 1 (Architecture & Specification)
> **Date:** 2026-10-09
> **Author:** Milestone 1 Architecture Review
> **Status:** Historical baseline specification

> **Historical note:** This document preserves the original Milestone-I architecture and requirements baseline. Its proposed directory structure, package versions, and implementation recommendations describe the original plan and may differ from the final implementation. The current source files and `package.json` are authoritative for the implemented application.

---

## 1. Project Overview

**Thompson Automata Studio** is a browser-only, single-page web application that lets a user enter a regular expression, visualise the ε-NFA produced by Thompson's construction algorithm, and simulate arbitrary input strings against it with a full step-by-step trace.

The primary academic objective is to demonstrate a correct and well-engineered implementation of:

1. Recursive-descent regex parsing with explicit operator-precedence rules.
2. Thompson's construction (McNaughton–Yamada–Thompson algorithm).
3. ε-closure computation and NFA subset simulation.
4. Interactive, data-driven graph visualisation of the constructed automaton.

---

## 2. Supported Grammar

### 2.1 Alphabet

The user-visible alphabet consists of all printable ASCII characters except reserved operators listed below.

| Character | Role |
|-----------|------|
| `(` `)` | Grouping parentheses |
| `\|` | Union operator |
| `*` | Kleene star |
| `E` | Epsilon alias |
| `ε` | Epsilon (U+03B5) |

Whitespace is stripped before parsing (treated as insignificant).

> **Out of scope:** `+`, `?`, `.`, `^`, `$`, `\`, `[…]`, `{n,m}` — all produce clear error messages.

### 2.2 Epsilon Convention

| Input form | Interpretation |
|------------|----------------|
| `E` | Epsilon (empty string) |
| `ε` (U+03B5) | Epsilon (empty string) |
| Empty editor field | Not a valid regex — show guidance |

Both `E` and `ε` are normalised to internal token `EPSILON` before parsing.
The UI always displays epsilon as the Greek character ε.

### 2.3 Operator Precedence (highest to lowest)

| Priority | Operator | Associativity |
|----------|----------|---------------|
| 1 (highest) | `( )` — grouping | N/A |
| 2 | `*` — Kleene star | right-to-left (postfix) |
| 3 | Concatenation (implicit) | left-to-right |
| 4 (lowest) | `\|` — union | left-to-right |

### 2.4 Formal Grammar (EBNF)

```
regex     ::= union
union     ::= concat ( '|' concat )*
concat    ::= star ( star )*          -- implicit concatenation
star      ::= atom '*'*
atom      ::= SYMBOL | EPSILON | '(' regex ')'
SYMBOL    ::= any supported alphabet character
EPSILON   ::= 'E' | 'ε'
```

### 2.5 Error Examples

| Input | Error message |
|-------|---------------|
| (empty) | "Please enter a regular expression." |
| `a+` | "'+' is not a supported operator. Use `aa*` for one-or-more." |
| `a?` | "'?' is not a supported operator. Use `(a\|E)` for zero-or-one." |
| `*a` | "Kleene star (*) must follow an operand." |
| `a\|` | "Missing right operand for union operator '\|'." |
| `(ab` | "Unmatched opening parenthesis '('." |
| `ab)` | "Unexpected closing parenthesis ')'." |

---

## 3. Data Models (TypeScript)

```typescript
type StateId = number;

interface NFAState {
  id: StateId;
  label: string;       // "q0", "q1", ...
  isStart: boolean;
  isAccepting: boolean;
}

interface NFATransition {
  from: StateId;
  to: StateId;
  symbol: string;      // single char, or EPSILON_SYMBOL = 'ε'
}

interface NFA {
  states: NFAState[];
  transitions: NFATransition[];
  startState: StateId;
  acceptingStates: StateId[];
  alphabet: Set<string>;
}

interface SimulationStep {
  stepIndex: number;
  symbol: string | null;
  activeStatesBefore: StateId[];
  epsilonClosure: StateId[];
  activeStatesAfter: StateId[];
  description: string;
}

interface SimulationResult {
  input: string;
  accepted: boolean;
  steps: SimulationStep[];
  finalActiveStates: StateId[];
  rejectionReason?: string;
}

interface BatchTestCase {
  input: string;
  expectedResult?: 'accept' | 'reject';
}

interface BatchTestResult {
  testCase: BatchTestCase;
  result: SimulationResult;
  passed?: boolean;
}
```

Internal only (not exported to UI):
```typescript
interface NFAFragment { start: StateId; accept: StateId; }
```

---

## 4. Module Architecture

### 4.1 Directory Structure

```
automata/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── tailwind.config.ts
├── components.json            (shadcn/ui config)
├── vitest.config.ts
├── PROJECT_SPEC.md
│
├── public/
│   └── favicon.svg
│
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    │
    ├── engine/                PURE LOGIC — no UI imports allowed
    │   ├── constants.ts       EPSILON_SYMBOL, reserved chars
    │   ├── types.ts           All shared TypeScript interfaces
    │   ├── tokenizer.ts       Lexing, normalisation, validation
    │   ├── parser.ts          Recursive-descent parser → AST
    │   ├── ast.ts             AST node types
    │   ├── thompson.ts        Thompson construction → NFA
    │   ├── closure.ts         ε-closure (BFS, cycle-safe)
    │   ├── simulator.ts       NFA simulation → SimulationResult
    │   └── index.ts           Re-exports
    │
    ├── graph/                 React Flow adapter
    │   ├── layout.ts          Left-to-right layered auto-layout
    │   ├── nfaToFlow.ts       NFA → { nodes, edges }
    │   └── customNodes.tsx    Styled state nodes
    │
    ├── components/
    │   ├── ui/                shadcn generated (do not edit manually)
    │   ├── RegexEditor.tsx
    │   ├── SyntaxHelp.tsx
    │   ├── GraphWorkspace.tsx
    │   ├── SimulationPanel.tsx
    │   ├── TraceLog.tsx
    │   ├── BatchTester.tsx
    │   └── StatusBadge.tsx
    │
    ├── hooks/
    │   ├── useNFA.ts
    │   ├── useSimulation.ts
    │   └── useBatchTest.ts
    │
    └── test/
        ├── tokenizer.test.ts
        ├── parser.test.ts
        ├── thompson.test.ts
        ├── closure.test.ts
        ├── simulator.test.ts
        └── epsilon.test.ts    (E / ε equivalence — required by spec)
```

**Critical rule:** `engine/` has zero imports from `components/`, `graph/`, `hooks/`, or any UI library.

### 4.2 Module Dependency Graph

```
App
 ├── hooks/ ──────────┐
 ├── graph/           ├──▶ engine/
 └── components/      │     ├── tokenizer
      └── uses hooks ─┘     ├── parser (AST)
                            ├── thompson
                            ├── closure
                            └── simulator
```

---

## 5. Engine Module API

### 5.1 tokenizer.ts

```typescript
function tokenize(raw: string): Token[] | TokenizeError;

type TokenType = 'SYMBOL' | 'EPSILON' | 'UNION' | 'STAR' | 'LPAREN' | 'RPAREN' | 'EOF';
interface Token        { type: TokenType; value: string; position: number; }
interface TokenizeError { message: string; position: number; }
```

Responsibilities: strip whitespace, reject unsupported chars with position-aware errors,
normalise E and ε → `{ type: 'EPSILON', value: 'ε' }`, error on empty input.

### 5.2 ast.ts

```typescript
type ASTNode =
  | { kind: 'Symbol';  value: string }
  | { kind: 'Epsilon' }
  | { kind: 'Union';  left: ASTNode; right: ASTNode }
  | { kind: 'Concat'; left: ASTNode; right: ASTNode }
  | { kind: 'Star';   operand: ASTNode };
```

### 5.3 parser.ts

```typescript
function parse(tokens: Token[]): ASTNode | ParseError;
interface ParseError { message: string; position: number; }
```

Implements grammar from §2.4 via recursive descent. Never throws; always returns a tagged result.

### 5.4 thompson.ts

```typescript
function buildNFA(ast: ASTNode): NFA;
```

Thompson construction rules:

| Expression | New states | New transitions |
|------------|-----------|-----------------|
| ε | qₛ, qₐ | qₛ →ε→ qₐ |
| symbol `a` | qₛ, qₐ | qₛ →a→ qₐ |
| `N(s) \| N(t)` | q_new_s, q_new_a | q_new_s →ε→ start(s); q_new_s →ε→ start(t); accept(s) →ε→ q_new_a; accept(t) →ε→ q_new_a |
| `N(s) · N(t)` | 0 | accept(s) →ε→ start(t) |
| `N(s)*` | q_new_s, q_new_a | q_new_s →ε→ start(s); q_new_s →ε→ q_new_a; accept(s) →ε→ start(s); accept(s) →ε→ q_new_a |

States labelled q0, q1, … in creation order.

### 5.5 closure.ts

```typescript
function epsilonClosure(states: StateId[], nfa: NFA): StateId[];
function move(states: StateId[], symbol: string, nfa: NFA): StateId[];
```

BFS with `Set<StateId>` visited guard. Cycle-safe. O(S + T) per call.

### 5.6 simulator.ts

```typescript
function simulate(input: string, nfa: NFA): SimulationResult;
```

Algorithm:
1. active = epsilonClosure([startState]).
2. For each symbol c in input:
   a. next = move(active, c, nfa).
   b. Record SimulationStep. If next is empty, stop early (rejection).
   c. active = next.
3. accepted = (active ∩ acceptingStates) ≠ ∅.
4. Empty input: skip step 2; accept if initial ε-closure contains accepting state.

---

## 6. Graph Visualisation

### 6.1 nfaToFlow.ts

Converts NFA → { nodes: Node[], edges: Edge[] } for React Flow.
Multiple transitions between same pair → merged comma-separated label (e.g. "a, ε").
Self-loops use a curved/looped edge type.

### 6.2 layout.ts

Left-to-right layered layout (BFS from start state):
- Layer 0 = start state.
- Symbol transitions advance one layer per hop.
- Uniform vertical spacing within each layer.
- No external layout library required.

### 6.3 Node Styles

| State type | Visual |
|------------|--------|
| Normal | Circle with label |
| Start | Entry arrow from left |
| Accepting | Double-ring border |
| Active (simulation) | Amber/yellow highlight |

---

## 7. UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: "Thompson Automata Studio"                             │
├────────────────────────┬────────────────────────────────────────┤
│  LEFT PANEL (400px)    │  GRAPH WORKSPACE (flex-grow)           │
│                        │                                        │
│  [Regex input]         │  React Flow canvas                     │
│  [Insert ε] [Build]    │  (zoom + pan enabled)                  │
│  [Syntax help ▾]       │                                        │
│                        │                                        │
│  ── Simulation ──      │                                        │
│  [Input] [Run]         │                                        │
│  [Accept / Reject]     │                                        │
│  [Trace log scroll]    │                                        │
│                        │                                        │
│  ── Batch Test ──      │                                        │
│  [Textarea] [Run All]  │                                        │
│  [Results table]       │                                        │
└────────────────────────┴────────────────────────────────────────┘
```

Responsive: ≤768 px → single column, graph workspace stacks below left panel.

---

## 8. Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| ε-closure infinite loop on epsilon cycles | High | BFS visited-set guard; unit test `(E)*` |
| React Flow layout overlap for large NFAs | Medium | Fixed layer spacing constants |
| Operator precedence bugs | High | Exhaustive unit tests for all precedence combos |
| Mismatched parenthesis detection | Medium | Position-tagged ParseError |
| E token colliding with user intent | Medium | Reserved-char list + UI help text |
| Tailwind v4 / shadcn compatibility | Low | Pin known-compatible versions |

---

## 9. Test Plan

### Required Test Files

| File | Covers |
|------|--------|
| `tokenizer.test.ts` | Normalisation, empty input, unsupported operators |
| `parser.test.ts` | Grammar productions, errors, precedence |
| `thompson.test.ts` | State/transition counts per rule |
| `closure.test.ts` | BFS correctness, cycle guard |
| `simulator.test.ts` | Accept/reject, edge cases |
| `epsilon.test.ts` | E and ε produce identical NFAs |

### Mandatory Boundary Cases

```
Tokenizer:   ""       → empty-input error
             "a+"     → unsupported-operator error at position 1
             "E"      → [EPSILON]
             "ε"      → [EPSILON]

Parser:      "*a"     → star-without-operand error
             "(ab"    → unmatched paren error
             "a|"     → missing operand error
             "a**"    → valid (same as a*)

Thompson:    "a"      → 2 states, 1 transition
             "ab"     → 4 states, 3 transitions
             "a|b"    → 6 states, 6 transitions
             "a*"     → 4 states, 4 transitions

Simulator:   a*, ""       → accept
             a*, "aaa"    → accept
             a,  "aa"     → reject (partial match)
             E,  ""       → accept
             E,  "a"      → reject
             (a|E)*, ""   → accept (epsilon cycle guard)
```

---

## 10. Implementation Milestones

### Milestone 1 — Architecture & Specification ✅ (this document)
- Workspace inspected: empty directory.
- Grammar, models, interfaces, directory structure defined.
- No code written.

### Milestone 2 — Engine Core
Deliverables: `src/engine/` fully implemented. All unit tests pass via `vitest run`.
Acceptance:
- All §9 test files passing with 0 failures.
- `(a|b)*abb` accepts "abb", "aabb", "babb"; rejects "ab", "".
- `E` and `ε` produce identical NFA JSON (epsilon.test.ts).
- Epsilon cycle `(E)*` does not hang.

### Milestone 3 — Project Scaffold & React Flow Graph
Deliverables: Vite + Tailwind v4 + shadcn/ui + @xyflow/react scaffold. `nfaToFlow.ts` and `layout.ts`. `GraphWorkspace.tsx` renders a live NFA.
Acceptance:
- `npm run dev` with no console errors.
- `(a|b)*abb` NFA renders with correct node count, ε edge labels, double-ring accepting state.

### Milestone 4 — Simulation UI & Trace
Deliverables: `RegexEditor.tsx` (Insert ε, Build), `SimulationPanel.tsx` (Run, badge), `TraceLog.tsx`, hooks.
Acceptance:
- Full user flow works end-to-end.
- All error states show specific messages.

### Milestone 5 — Batch Testing & Polish
Deliverables: `BatchTester.tsx`, responsive layout, `SyntaxHelp.tsx`, graph highlighting, README.
Acceptance:
- Batch ≥20 strings without freeze.
- Responsive at 768 px.
- All Milestone 2 tests still passing.
- No TypeScript `any` in engine.

---

## 11. Recommended Package Versions

| Package | Constraint |
|---------|-----------|
| react / react-dom | ^18.3 |
| typescript | ^5.5 |
| vite | ^5.4 |
| @vitejs/plugin-react | ^4.3 |
| @tailwindcss/vite | ^4.0 |
| tailwindcss | ^4.0 |
| @xyflow/react | ^12.3 |
| lucide-react | ^0.400+ |
| vitest | ^2.0 |
| @testing-library/react | ^16.0 |

---

## 12. Engineering Conventions

1. `engine/` imports only from itself. No React, no DOM.
2. Engine functions return tagged union results — never throw.
3. `EPSILON_SYMBOL` always imported from `engine/constants.ts`.
4. State IDs assigned by a single counter per `buildNFA` call.
5. `strict: true` in tsconfig. No `any` in engine files.
6. Test names are self-documenting: `"simulate: (a|b)*abb accepts 'abb'"`.
7. No fake or hardcoded graphs — displayed graph always reflects live `buildNFA` output.
