# Thompson Automata Studio

> **Regular Expression to ε-NFA Construction, Graph Visualization & Step-by-Step Simulation Studio**
> *CSET302 — Group 1 | Bennett University, SCSET*

---

## 1. Project Overview & Objectives

**Thompson Automata Studio** is an academic developer tool built with React, TypeScript, Vite, Tailwind CSS, and React Flow (`@xyflow/react`). It bridges formal automata theory and modern software engineering by allowing users to enter arbitrary regular expressions, view the exact nondeterministic finite automaton with $\epsilon$-transitions ($\epsilon$-NFA) generated via Thompson's construction, and simulate input strings with an interactive, step-by-step trace that highlights active state sets on the graph in real time.

### Core Academic Goals
1. **Faithful Algorithmic Implementation:** Implement the canonical McNaughton–Yamada–Thompson construction algorithm without third-party automata libraries or hardcoded graphs.
2. **Deterministic Precedence & Parsing:** Recursive-descent parsing with explicit operator precedence: Grouping `()` > Kleene star `*` > Implicit concatenation `ab` > Union `|`.
3. **Formal $\epsilon$-Closure & Simulation:** Cycle-safe $\epsilon$-closure computation and subset-based NFA simulation supporting the empty input word.
4. **Architectural Separation:** Strict separation between pure automata theory logic (`src/engine/`) and presentation/graph visualization (`src/graph/`, `src/components/`).

---

## 2. Key Features

- **Regex Editor & Syntax Validation:** Position-aware, actionable error diagnostics. Unsupported constructs (`+`, `?`, `.`, `^`, `$`, `\`, character classes) provide helpful feedback rather than silent reinterpretation.
- **First-Class Epsilon Support:** Accepts both uppercase `E` and Greek `ε`. Dedicated "Insert ε" button inserts the symbol directly at the cursor.
- **Interactive Directed Graph:** Data-driven layout powered by React Flow with zoom, pan, minimap, fit-to-view controls, and live simulation highlighting.
- **Formal Transition Table:** Switch between the NFA graph and a tabular view of every transition, including the start state, accepting state, and alphabet.
- **Clear State Notations:** Standard formal notations with start state indicator (`Start ➔`) and double concentric circle for accepting states.
- **Single-String Interactive Tracer:** Step-by-step debugger showing input symbols consumed, active state sets before/after, $\epsilon$-closures, and live highlighted states/transitions.
- **Comprehensive Batch Testing:** Test suite evaluator supporting bulk input, individual test rows, prediction verification (Pass/Fail/Unverified), and mathematical metrics (accepted/rejected counts, pass rates).
- **Graceful Error Preservation:** Submitting an invalid regex displays actionable diagnostics while preserving the previous valid automaton on canvas.

---

## 3. Technology Stack

- **UI Framework:** React 19 (TypeScript)
- **Build Tool & Dev Server:** Vite 8
- **Styling:** Tailwind CSS v4 (Dark Slate / Navy theme)
- **Graph Visualization:** `@xyflow/react` (React Flow v12)
- **Icons:** Lucide React
- **Test Runner:** Vitest v5
- **Compiler:** TypeScript 5.5 (`strict: true`)

---

## 4. Prerequisites

- **Node.js:** v18.0.0 or later (Node.js 20 LTS or newer recommended)
- **npm:** v9.0.0 or later

---

## 5. Installation & Startup

Clone or navigate to the project directory, then:

```bash
# Install dependencies
npm install

# Start local development server
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## 6. Testing, Type-Checking & Building

```bash
# Run all automated test suites (Vitest)
npm run test

# Run strict TypeScript compiler verification (zero emissions)
npm run typecheck

# Build optimized production bundle
npm run build

# Preview the production build locally
npm run preview
```

---

## 7. Supported Grammar & Precedence

The engine lexes and parses expressions over the printable ASCII alphabet (excluding reserved control operators).

| Precedence | Operator | Description | Associativity | Example |
|---|---|---|---|---|
| 1 (Highest) | `( ... )` | Parenthesized grouping | N/A | `(a\|b)` |
| 2 | `*` | Kleene star (0 or more repetitions) | Right-to-left (postfix) | `a*`, `(ab)*` |
| 3 | Implicit | Concatenation (adjacent atoms) | Left-to-right | `ab`, `a(b\|c)` |
| 4 (Lowest) | `\|` | Alternation / Union | Left-to-right | `a\|b\|c` |

### Epsilon Convention
- Both uppercase `E` and Greek `ε` (U+03B5) are normalized to an internal `EPSILON` token prior to parsing.
- Uppercase `E` is strictly reserved for epsilon and is **never** treated as an ordinary alphabet symbol.
- Graph edges and trace logs consistently render epsilon as `ε`.
- The empty editor input is treated as a validation error ("Please enter a regular expression"), whereas explicit `E` and `ε` represent the language $\{\epsilon\}$.

---

## 8. Thompson's Construction Rules

Each regular expression AST node is converted into an equivalent NFA fragment possessing exactly **one start state** and **one accepting state**:

1. **Symbol Atom ($a$):**
   $$q_{\text{start}} \xrightarrow{a} q_{\text{accept}} \quad (2\text{ states}, 1\text{ transition})$$
2. **Epsilon Atom ($\epsilon$):**
   $$q_{\text{start}} \xrightarrow{\epsilon} q_{\text{accept}} \quad (2\text{ states}, 1\text{ transition})$$
3. **Concatenation ($N(s) \cdot N(t)$):**
   Connects the accepting state of $N(s)$ to the start state of $N(t)$ via an $\epsilon$-transition:
   $$q_{\text{accept}}(s) \xrightarrow{\epsilon} q_{\text{start}}(t) \quad (0\text{ new states}, 1\text{ new transition})$$
4. **Union ($N(s) \mid N(t)$):**
   Creates new start and accepting states, branching via $\epsilon$:
   \[
   \begin{aligned}
   q_{\text{new}\_\text{start}} &\xrightarrow{\epsilon} q_{\text{start}}(s), \quad q_{\text{new}\_\text{start}} \xrightarrow{\epsilon} q_{\text{start}}(t) \\
   q_{\text{accept}}(s) &\xrightarrow{\epsilon} q_{\text{new}\_\text{accept}}, \quad q_{\text{accept}}(t) \xrightarrow{\epsilon} q_{\text{new}\_\text{accept}}
   \end{aligned}
   \]
5. **Kleene Star ($N(s)^*$):**
   Creates new start and accepting states with entry, skip, loopback, and exit $\epsilon$-transitions:
   \[
   \begin{aligned}
   q_{\text{new}\_\text{start}} &\xrightarrow{\epsilon} q_{\text{start}}(s), \quad q_{\text{new}\_\text{start}} \xrightarrow{\epsilon} q_{\text{new}\_\text{accept}} \\
   q_{\text{accept}}(s) &\xrightarrow{\epsilon} q_{\text{start}}(s), \quad q_{\text{accept}}(s) \xrightarrow{\epsilon} q_{\text{new}\_\text{accept}}
   \end{aligned}
   \]

---

## 9. $\epsilon$-Closure & Simulation Algorithm

Given an automaton $N = (Q, \Sigma, \delta, q_0, F)$ and input string $w = c_1 c_2 \dots c_n$:

1. **Initial State:**
   $$S_0 = \epsilon\text{-closure}(\{q_0\})$$
   Computed using breadth-first search (BFS) with a visited set to guarantee termination on $\epsilon$-cycles.
2. **Transition Step for each symbol $c_i$:**
   $$\text{Move}(S_{i-1}, c_i) = \{v \in Q \mid \exists u \in S_{i-1}, (u \xrightarrow{c_i} v) \in \delta\}$$
   $$S_i = \epsilon\text{-closure}(\text{Move}(S_{i-1}, c_i))$$
   - If $S_i = \emptyset$, simulation halts early due to a missing transition (dead state).
3. **Acceptance Criterion:**
   $$w \in L(N) \iff S_n \cap F \neq \emptyset$$
   The empty input string $w = \epsilon$ skips the step loop and evaluates $S_0 \cap F \neq \emptyset$.

---

## 10. Project Directory Structure

```
automata/
├── src/
│   ├── engine/                  # Pure TypeScript automata core (zero UI dependencies)
│   │   ├── constants.ts         # EPSILON_SYMBOL, reserved characters, errors
│   │   ├── types.ts             # AST, NFA, Simulation, and Batch interfaces
│   │   ├── tokenizer.ts         # Lexing, whitespace stripping, E/ε normalisation
│   │   ├── parser.ts            # Recursive-descent AST parser
│   │   ├── thompson.ts          # Thompson construction algorithm
│   │   ├── closure.ts           # Cycle-safe ε-closure & move operations
│   │   ├── simulator.ts         # NFA string simulation & trace generation
│   │   ├── batch.ts             # Batch testing & prediction metrics runner
│   │   └── index.ts             # Engine barrel re-export
│   │
│   ├── graph/                   # Graph visualization adapter
│   │   ├── layout.ts            # Layered auto-layout algorithm
│   │   ├── customNodes.tsx      # StateNode (start arrow, double circle, active glow)
│   │   ├── nfaToFlow.ts         # NFA-to-Flow adapter & highlight mapper
│   │   └── index.ts             # Graph barrel re-export
│   │
│   ├── components/              # UI Components
│   │   ├── Header.tsx           # Application header with NFA metrics
│   │   ├── RegexEditor.tsx      # Controlled editor, Insert ε, presets, syntax guide
│   │   ├── SimulationPanel.tsx  # Single string simulator with step tracer
│   │   ├── BatchTester.tsx      # Multi-input test suite & verification metrics
│   │   └── GraphWorkspace.tsx   # React Flow interactive canvas & minimap
│   │
│   ├── test/                    # Comprehensive automated Vitest suites
│   │   ├── tokenizer.test.ts    # Lexing and operator rejection
│   │   ├── parser.test.ts       # Grammar productions and precedence
│   │   ├── thompson.test.ts     # Construction invariants and fragment rules
│   │   ├── closure.test.ts      # ε-closure BFS and cycle safety
│   │   ├── simulator.test.ts    # Simulation correctness and partial matches
│   │   ├── epsilon.test.ts      # E and ε exact equivalence suite
│   │   ├── boundary.test.ts     # Boundary cases and error handling
│   │   ├── graph.test.ts        # Flow adapter and layout coordinates
│   │   ├── simulation_flow.test.ts # Tracer and manual verification suite
│   │   └── batch.test.ts        # Batch execution and pass rate metrics
│   │
│   ├── App.tsx                  # Main application orchestrator
│   ├── main.tsx                 # React DOM mount entry
│   └── index.css                # Tailwind CSS v4 & React Flow styles
│
├── package.json                 # Scripts and dependencies
├── tsconfig.json                # Strict TypeScript configuration
├── vite.config.ts               # Vite configuration with Tailwind plugin
└── vitest.config.ts             # Vitest test configuration
```

---

## 11. Example Expressions & Expected Behavior

| Expression | Test Input | Expected Result | Trace / Construction Notes |
|---|---|---|---|
| `a*` | `""` (empty) | **Accepted** | Skip transition $q_2 \xrightarrow{\epsilon} q_3$ reaches accepting state immediately. |
| `a*` | `aaaa` | **Accepted** | Loops across $q_1 \xrightarrow{\epsilon} q_0$ four times. |
| `a*` | `b` | **Rejected** | No transition on `'b'` from active state set $\{q_0, q_2, q_3\}$. |
| `ab` | `ab` | **Accepted** | Consumes `'a'` to bridge state, then `'b'` to accepting state. |
| `ab` | `a` | **Rejected** | Input consumed, but active set $\{q_2\}$ does not include accepting state $q_3$. |
| `E` | `""` (empty) | **Accepted** | Initial $\epsilon$-closure reaches accepting state. |
| `E` | `a` | **Rejected** | No transition on `'a'`. |
| `E\|a` | `""` (empty) | **Accepted** | Start state branches to $\epsilon$-arm reaching accepting state. |
| `E\|a` | `a` | **Accepted** | Start state branches to symbol-arm consuming `'a'`. |
| `(a\|b)*abb` | `aabb` | **Accepted** | Star loop handles `aa`, tail handles `bb`. |
| `(a\|b)*abb` | `ab` | **Rejected** | Stops at $q_{11}$ awaiting the final `'b'`. |
| `a\|` | Any | **Compile Error** | Rejected with "Missing right operand for union operator '|'". |

---

## 12. Known Limitations & Scope Boundaries

- **Supported Grammar:** Initially supports basic regular algebra (`()`, `*`, implicit concat, `|`, and `E`/`ε`). Advanced regex syntax such as `+`, `?`, character classes `[...]`, and backreferences are intentionally out of scope and rejected with clear diagnostic messages.
- **NFA Non-Determinism:** The simulator directly runs subset-construction active state sets on the $\epsilon$-NFA rather than converting to a DFA or performing Hopcroft minimization.
- **Graph Layout:** The layered DAG layout calculates horizontal ranks based on topological distance from the start state. For deeply nested Kleene stars, backwards edges loop over the top of state columns; users can pan and zoom the canvas freely.


## 13. Team and course details

- **Course:** CSET302 — Automata Theory and Computability
- **Group:** Group 1 (three-member composition confirmed with faculty evaluator)
- **Faculty evaluator:** Dr. Rajnish Chaturvedi
- **Kathansh Jain:** Algorithm implementation.
- **Nishant:** Algorithm implementation and documentation.
- **Aryan Gupta:** Testing, debugging and UI improvements.

See [`TEAM_CONTRIBUTIONS.md`](TEAM_CONTRIBUTIONS.md) for the responsibility summary.

## 14. Verification status

The final verification run completed on 14 November 2026:

- `npm ci`: completed successfully; npm audit reported no vulnerabilities.
- `npm test`: **304 tests passed** across 11 test files, including the final Milestone-II matrix.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run lint`: not configured in `package.json`.
- Browser verification: completed against the Vite development server, including graph generation, transition table, step tracing, execution summary, batch testing, highlighting, and layout reset.

University submission artifacts are maintained separately from this public project repository. The test plan in [`MILESTONE_II_TEST_PLAN.md`](MILESTONE_II_TEST_PLAN.md) records the verified cases and results.
