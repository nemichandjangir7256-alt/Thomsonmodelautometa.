# Development Notes

## Architecture

The `src/engine/` directory contains the UI-independent automata implementation. It tokenizes and parses regular expressions, constructs Thompson fragments, computes ε-closures, simulates input strings, and runs batch tests. The engine does not import React, React Flow, or browser APIs.

The `src/graph/` directory adapts NFAs to React Flow nodes and edges. The `src/components/` directory contains the editor, graph workspace, simulator, and batch tester. `src/App.tsx` coordinates compilation, simulation state, trace navigation, and graph highlighting.

## Implementation conventions

- Engine errors are returned as discriminated unions rather than thrown from normal parsing and tokenization paths.
- State sets from ε-closure and move operations are sorted and deduplicated for deterministic output.
- Epsilon transitions use the shared `EPSILON_SYMBOL` constant.
- Graph layout is generated for a newly constructed NFA and is not recalculated during trace navigation.

## Verification commands

```bash
npm ci
npm test
npm run typecheck
npm run build
```

The project does not currently define a lint script.
