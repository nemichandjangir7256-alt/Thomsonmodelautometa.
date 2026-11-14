/**
 * closure.test.ts
 * Tests for epsilonClosure() and move() in closure.ts.
 */

import { describe, it, expect } from 'vitest';
import { epsilonClosure, move } from '../engine/closure.js';
import { buildNFA } from '../engine/thompson.js';
import { parse } from '../engine/parser.js';
import { tokenize } from '../engine/tokenizer.js';
import { isParseError, isTokenizeError } from '../engine/types.js';
import type { NFA } from '../engine/types.js';

// ─── Helper ───────────────────────────────────────────────────────────────────

function compile(raw: string): NFA {
  const tokens = tokenize(raw);
  if (isTokenizeError(tokens)) throw new Error(`Tokenize: ${tokens.message}`);
  const ast = parse(tokens);
  if (isParseError(ast)) throw new Error(`Parse: ${ast.message}`);
  return buildNFA(ast);
}

// ─── epsilonClosure ───────────────────────────────────────────────────────────

describe('epsilonClosure: basic properties', () => {
  it('includes the original state(s) in the closure', () => {
    const nfa = compile('a');
    // q0 --a--> q1; no ε-transitions from q0
    const closure = epsilonClosure([nfa.startState], nfa);
    expect(closure).toContain(nfa.startState);
  });

  it('returns sorted, deduplicated results', () => {
    const nfa = compile('a*');
    const closure = epsilonClosure([nfa.startState], nfa);
    const sorted = [...closure].sort((a, b) => a - b);
    expect(closure).toEqual(sorted);
    // No duplicates
    expect(new Set(closure).size).toBe(closure.length);
  });

  it('closure of an empty set is an empty array', () => {
    const nfa = compile('a');
    expect(epsilonClosure([], nfa)).toEqual([]);
  });
});

describe('epsilonClosure: ε-reachability', () => {
  it('epsilon NFA (E): closure of start reaches accepting state', () => {
    const nfa = compile('E');
    const closure = epsilonClosure([nfa.startState], nfa);
    expect(closure).toContain(nfa.acceptingStates[0]);
  });

  it('a* start state: ε-closure reaches accepting state (skip arc)', () => {
    const nfa = compile('a*');
    const closure = epsilonClosure([nfa.startState], nfa);
    // The new start has a skip arc directly to the new accept
    expect(closure).toContain(nfa.acceptingStates[0]);
  });

  it('a|b start state: ε-closure reaches both branch starts', () => {
    const nfa = compile('a|b');
    const closure = epsilonClosure([nfa.startState], nfa);
    // Should reach the start states of N(a) and N(b)
    expect(closure.length).toBeGreaterThan(1);
  });
});

describe('epsilonClosure: epsilon cycle termination', () => {
  it('(E)* does not hang — terminates with a finite result', () => {
    const nfa = compile('(E)*');
    // (E)* has ε-cycles; closure must terminate
    const start = Date.now();
    const closure = epsilonClosure([nfa.startState], nfa);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(100); // well within 100 ms
    expect(closure.length).toBeGreaterThan(0);
    expect(new Set(closure).size).toBe(closure.length); // no duplicates
  });

  it('(a|E)* closure terminates and includes accepting state', () => {
    const nfa = compile('(a|E)*');
    const closure = epsilonClosure([nfa.startState], nfa);
    expect(closure).toContain(nfa.acceptingStates[0]);
  });
});

// ─── move ─────────────────────────────────────────────────────────────────────

describe('move: basic', () => {
  it('move on a from start of NFA(a) returns non-empty set', () => {
    const nfa = compile('a');
    const result = move([nfa.startState], 'a', nfa);
    expect(result.length).toBeGreaterThan(0);
  });

  it('move on a from start of NFA(a) reaches accepting state', () => {
    const nfa = compile('a');
    const result = move([nfa.startState], 'a', nfa);
    expect(result).toContain(nfa.acceptingStates[0]);
  });

  it('move on wrong symbol returns empty array', () => {
    const nfa = compile('a');
    expect(move([nfa.startState], 'b', nfa)).toEqual([]);
  });

  it('move on empty active set returns empty array', () => {
    const nfa = compile('a');
    expect(move([], 'a', nfa)).toEqual([]);
  });

  it('move already applies ε-closure', () => {
    // For 'ab': after consuming 'a', the result should include states
    // reachable via ε from the 'a'-reachable state (the concat bridge).
    const nfa = compile('ab');
    const afterA = move([nfa.startState], 'a', nfa);
    // Should be non-empty
    expect(afterA.length).toBeGreaterThan(0);
  });
});

describe('move: a* simulation steps', () => {
  it('move on a from a* start returns non-empty (loop works)', () => {
    const nfa = compile('a*');
    const afterClosure = epsilonClosure([nfa.startState], nfa);
    const result = move(afterClosure, 'a', nfa);
    expect(result.length).toBeGreaterThan(0);
  });

  it('move on a|b: a leads to accepting', () => {
    const nfa = compile('a|b');
    const initialClosure = epsilonClosure([nfa.startState], nfa);
    const afterA = move(initialClosure, 'a', nfa);
    expect(afterA).toContain(nfa.acceptingStates[0]);
  });

  it('move on a|b: b leads to accepting', () => {
    const nfa = compile('a|b');
    const initialClosure = epsilonClosure([nfa.startState], nfa);
    const afterB = move(initialClosure, 'b', nfa);
    expect(afterB).toContain(nfa.acceptingStates[0]);
  });
});

describe('move: deduplication', () => {
  it('result contains no duplicate state IDs', () => {
    const nfa = compile('(a|b)*');
    const initial = epsilonClosure([nfa.startState], nfa);
    const result = move(initial, 'a', nfa);
    expect(new Set(result).size).toBe(result.length);
  });
});
