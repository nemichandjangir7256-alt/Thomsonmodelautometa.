/**
 * thompson.test.ts
 * Tests for Thompson's construction: state/transition counts, structural
 * invariants, and correctness of each construction rule.
 */

import { describe, it, expect } from 'vitest';
import { tokenize } from '../engine/tokenizer.js';
import { parse } from '../engine/parser.js';
import { buildNFA } from '../engine/thompson.js';
import { isParseError, isTokenizeError } from '../engine/types.js';
import { EPSILON_SYMBOL } from '../engine/constants.js';
import type { NFA } from '../engine/types.js';

// ─── Helper ───────────────────────────────────────────────────────────────────

function compile(raw: string): NFA {
  const tokens = tokenize(raw);
  if (isTokenizeError(tokens)) throw new Error(`Tokenize: ${tokens.message}`);
  const ast = parse(tokens);
  if (isParseError(ast)) throw new Error(`Parse: ${ast.message}`);
  return buildNFA(ast);
}

function countEpsilonTransitions(nfa: NFA): number {
  return nfa.transitions.filter(t => t.symbol === EPSILON_SYMBOL).length;
}

function countSymbolTransitions(nfa: NFA): number {
  return nfa.transitions.filter(t => t.symbol !== EPSILON_SYMBOL).length;
}

// ─── NFA invariants ───────────────────────────────────────────────────────────

describe('thompson: NFA structural invariants', () => {
  const expressions = ['a', 'ab', 'a|b', 'a*', '(ab)*', '(a|b)*abb', 'E'];

  for (const expr of expressions) {
    it(`invariants hold for '${expr}'`, () => {
      const nfa = compile(expr);

      // Start state exists
      const startState = nfa.states.find(s => s.id === nfa.startState);
      expect(startState, `start state q${nfa.startState} not found`).toBeDefined();

      // Accepting states exist
      expect(nfa.acceptingStates.length).toBeGreaterThan(0);
      for (const accId of nfa.acceptingStates) {
        const accState = nfa.states.find(s => s.id === accId);
        expect(accState, `accepting state q${accId} not found`).toBeDefined();
        expect(accState?.isAccepting).toBe(true);
      }

      // All state IDs are unique
      const ids = nfa.states.map(s => s.id);
      expect(new Set(ids).size).toBe(ids.length);

      // All transition endpoints reference valid states
      const idSet = new Set(ids);
      for (const t of nfa.transitions) {
        expect(idSet.has(t.from), `from state q${t.from} not in states`).toBe(true);
        expect(idSet.has(t.to), `to state q${t.to} not in states`).toBe(true);
      }

      // Start state is marked
      expect(startState?.isStart).toBe(true);

      // Labels follow q<id> pattern
      for (const s of nfa.states) {
        expect(s.label).toBe(`q${s.id}`);
      }
    });
  }
});

// ─── Base case: epsilon ───────────────────────────────────────────────────────

describe('thompson: epsilon base case', () => {
  it('E produces exactly 2 states', () => expect(compile('E').states.length).toBe(2));
  it('E produces exactly 1 transition', () => expect(compile('E').transitions.length).toBe(1));
  it('E transition is an ε-transition', () => {
    expect(compile('E').transitions[0].symbol).toBe(EPSILON_SYMBOL);
  });
  it('ε produces exactly 2 states', () => expect(compile('ε').states.length).toBe(2));
});

// ─── Base case: single symbol ─────────────────────────────────────────────────

describe('thompson: symbol base case', () => {
  it('a produces exactly 2 states', () => expect(compile('a').states.length).toBe(2));
  it('a produces exactly 1 transition', () => expect(compile('a').transitions.length).toBe(1));
  it('a transition is labelled a', () => {
    expect(compile('a').transitions[0].symbol).toBe('a');
  });
  it('a transition is NOT an ε-transition', () => {
    expect(compile('a').transitions[0].symbol).not.toBe(EPSILON_SYMBOL);
  });
});

// ─── Concatenation: N(s)·N(t) ─────────────────────────────────────────────────

describe('thompson: concatenation', () => {
  it('ab produces 4 states', () => expect(compile('ab').states.length).toBe(4));
  it('ab produces 3 transitions (2 symbol + 1 ε concat)', () => {
    expect(compile('ab').transitions.length).toBe(3);
  });
  it('ab has exactly 1 ε-transition (the concat bridge)', () => {
    expect(countEpsilonTransitions(compile('ab'))).toBe(1);
  });
  it('ab has exactly 2 symbol transitions', () => {
    expect(countSymbolTransitions(compile('ab'))).toBe(2);
  });
  it('alphabet of ab contains a and b', () => {
    const alpha = compile('ab').alphabet;
    expect(alpha.has('a')).toBe(true);
    expect(alpha.has('b')).toBe(true);
    expect(alpha.has(EPSILON_SYMBOL)).toBe(false);
  });
});

// ─── Union: N(s)|N(t) ─────────────────────────────────────────────────────────

describe('thompson: union', () => {
  it('a|b produces 6 states', () => expect(compile('a|b').states.length).toBe(6));
  it('a|b produces 6 transitions', () => expect(compile('a|b').transitions.length).toBe(6));
  it('a|b has 4 ε-transitions', () => {
    expect(countEpsilonTransitions(compile('a|b'))).toBe(4);
  });
  it('a|b has 2 symbol transitions', () => {
    expect(countSymbolTransitions(compile('a|b'))).toBe(2);
  });
});

// ─── Kleene star: N(s)* ───────────────────────────────────────────────────────

describe('thompson: Kleene star', () => {
  it('a* produces 4 states', () => expect(compile('a*').states.length).toBe(4));
  it('a* produces 5 transitions (1 symbol + 4 ε)', () => expect(compile('a*').transitions.length).toBe(5));
  it('a* has 4 ε-transitions', () => {
    // enter + skip + loop + exit = 4 ε-transitions
    expect(countEpsilonTransitions(compile('a*'))).toBe(4);
  });
  it('a* has 1 symbol transition', () => {
    expect(countSymbolTransitions(compile('a*'))).toBe(1);
  });
});

// ─── Complex: (a|b)*abb ───────────────────────────────────────────────────────

describe('thompson: (a|b)*abb', () => {
  it('has exactly one start state', () => {
    const nfa = compile('(a|b)*abb');
    expect(nfa.states.filter(s => s.isStart).length).toBe(1);
  });

  it('has exactly one accepting state', () => {
    const nfa = compile('(a|b)*abb');
    expect(nfa.acceptingStates.length).toBe(1);
    expect(nfa.states.filter(s => s.isAccepting).length).toBe(1);
  });

  it('start state is NOT accepting', () => {
    const nfa = compile('(a|b)*abb');
    const start = nfa.states.find(s => s.id === nfa.startState)!;
    expect(start.isAccepting).toBe(false);
  });

  it('alphabet contains only a and b', () => {
    const alpha = compile('(a|b)*abb').alphabet;
    expect(alpha.has('a')).toBe(true);
    expect(alpha.has('b')).toBe(true);
    expect([...alpha].filter(c => c !== 'a' && c !== 'b').length).toBe(0);
  });
});

// ─── State ID uniqueness across calls ────────────────────────────────────────

describe('thompson: state ID independence between calls', () => {
  it('two separate buildNFA calls produce independent ID sequences', () => {
    const nfa1 = compile('a');
    const nfa2 = compile('b');
    // Both should start from q0; IDs are reset per call
    expect(nfa1.startState).toBe(0);
    expect(nfa2.startState).toBe(0);
  });
});
