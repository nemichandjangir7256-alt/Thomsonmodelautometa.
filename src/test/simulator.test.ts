/**
 * simulator.test.ts
 * Tests for the NFA simulator: accept/reject correctness, trace structure,
 * edge cases, and partial match detection.
 */

import { describe, it, expect } from 'vitest';
import { simulate } from '../engine/simulator.js';
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

function accepts(regex: string, input: string): boolean {
  return simulate(input, compile(regex)).accepted;
}

function result(regex: string, input: string) {
  return simulate(input, compile(regex));
}

// ─── Single symbol ────────────────────────────────────────────────────────────

describe('simulate: single symbol a', () => {
  it('accepts "a"', () => expect(accepts('a', 'a')).toBe(true));
  it('rejects "b"', () => expect(accepts('a', 'b')).toBe(false));
  it('rejects "" (empty)', () => expect(accepts('a', '')).toBe(false));
  it('rejects "aa" (partial match — only one a expected)', () => expect(accepts('a', 'aa')).toBe(false));
});

// ─── Concatenation ab ─────────────────────────────────────────────────────────

describe('simulate: ab', () => {
  it('accepts "ab"', () => expect(accepts('ab', 'ab')).toBe(true));
  it('rejects "a"', () => expect(accepts('ab', 'a')).toBe(false));
  it('rejects "b"', () => expect(accepts('ab', 'b')).toBe(false));
  it('rejects ""', () => expect(accepts('ab', '')).toBe(false));
  it('rejects "abc" (too long)', () => expect(accepts('ab', 'abc')).toBe(false));
  it('rejects "ba"', () => expect(accepts('ab', 'ba')).toBe(false));
});

// ─── Union a|b ────────────────────────────────────────────────────────────────

describe('simulate: a|b', () => {
  it('accepts "a"', () => expect(accepts('a|b', 'a')).toBe(true));
  it('accepts "b"', () => expect(accepts('a|b', 'b')).toBe(true));
  it('rejects "ab"', () => expect(accepts('a|b', 'ab')).toBe(false));
  it('rejects ""', () => expect(accepts('a|b', '')).toBe(false));
  it('rejects "c"', () => expect(accepts('a|b', 'c')).toBe(false));
});

// ─── Kleene star a* ──────────────────────────────────────────────────────────

describe('simulate: a*', () => {
  it('accepts "" (zero repetitions)', () => expect(accepts('a*', '')).toBe(true));
  it('accepts "a"', () => expect(accepts('a*', 'a')).toBe(true));
  it('accepts "aaa"', () => expect(accepts('a*', 'aaa')).toBe(true));
  it('accepts "aaaaaaaaaa" (10 a\'s)', () => expect(accepts('a*', 'a'.repeat(10))).toBe(true));
  it('rejects "b"', () => expect(accepts('a*', 'b')).toBe(false));
  it('rejects "ab"', () => expect(accepts('a*', 'ab')).toBe(false));
});

// ─── (ab)* ────────────────────────────────────────────────────────────────────

describe('simulate: (ab)*', () => {
  it('accepts "" (zero repetitions)', () => expect(accepts('(ab)*', '')).toBe(true));
  it('accepts "ab"', () => expect(accepts('(ab)*', 'ab')).toBe(true));
  it('accepts "abab"', () => expect(accepts('(ab)*', 'abab')).toBe(true));
  it('rejects "a"', () => expect(accepts('(ab)*', 'a')).toBe(false));
  it('rejects "aba"', () => expect(accepts('(ab)*', 'aba')).toBe(false));
  it('rejects "b"', () => expect(accepts('(ab)*', 'b')).toBe(false));
});

// ─── (a|b)* ───────────────────────────────────────────────────────────────────

describe('simulate: (a|b)*', () => {
  it('accepts ""', () => expect(accepts('(a|b)*', '')).toBe(true));
  it('accepts "a"', () => expect(accepts('(a|b)*', 'a')).toBe(true));
  it('accepts "b"', () => expect(accepts('(a|b)*', 'b')).toBe(true));
  it('accepts "aabb"', () => expect(accepts('(a|b)*', 'aabb')).toBe(true));
  it('accepts "baba"', () => expect(accepts('(a|b)*', 'baba')).toBe(true));
  it('rejects "c"', () => expect(accepts('(a|b)*', 'c')).toBe(false));
  it('rejects "abc"', () => expect(accepts('(a|b)*', 'abc')).toBe(false));
});

// ─── (a|b)*abb ────────────────────────────────────────────────────────────────

describe('simulate: (a|b)*abb', () => {
  it('accepts "abb"', () => expect(accepts('(a|b)*abb', 'abb')).toBe(true));
  it('accepts "aabb"', () => expect(accepts('(a|b)*abb', 'aabb')).toBe(true));
  it('accepts "babb"', () => expect(accepts('(a|b)*abb', 'babb')).toBe(true));
  it('accepts "aababb"', () => expect(accepts('(a|b)*abb', 'aababb')).toBe(true));
  it('rejects ""', () => expect(accepts('(a|b)*abb', '')).toBe(false));
  it('rejects "ab"', () => expect(accepts('(a|b)*abb', 'ab')).toBe(false));
  it('rejects "ababa"', () => expect(accepts('(a|b)*abb', 'ababa')).toBe(false));
  it('rejects "abc"', () => expect(accepts('(a|b)*abb', 'abc')).toBe(false));
});

// ─── Partial match detection ──────────────────────────────────────────────────

describe('simulate: partial match rejection', () => {
  it('a does not accept "aa" (extra input after match)', () => {
    const r = result('a', 'aa');
    expect(r.accepted).toBe(false);
  });

  it('ab does not accept "ab " (trailing symbol)', () => {
    // No trailing space: 'ab ' has 3 symbols. NFA for 'ab' won't accept it.
    const r = result('ab', 'abc');
    expect(r.accepted).toBe(false);
  });
});

// ─── Missing transitions ──────────────────────────────────────────────────────

describe('simulate: missing transitions', () => {
  it('returns accepted=false when no transition exists', () => {
    const r = result('a', 'b');
    expect(r.accepted).toBe(false);
  });

  it('populates rejectionReason when rejected via dead state', () => {
    const r = result('a', 'b');
    expect(r.rejectionReason).toBeTruthy();
  });

  it('early-exits and records the dead step in the trace', () => {
    const r = result('a', 'b');
    // The step recording the dead state should have empty activeStatesAfter
    const deadStep = r.steps.find(s => s.activeStatesAfter.length === 0);
    expect(deadStep).toBeDefined();
  });
});

// ─── SimulationResult structure ───────────────────────────────────────────────

describe('simulate: result structure', () => {
  it('step 0 has null symbol (initial ε-closure)', () => {
    const r = result('a', 'a');
    expect(r.steps[0].symbol).toBeNull();
  });

  it('steps are indexed sequentially from 0', () => {
    const r = result('ab', 'ab');
    r.steps.forEach((step, i) => expect(step.stepIndex).toBe(i));
  });

  it('input field matches what was passed', () => {
    const r = result('a', 'test');
    expect(r.input).toBe('test');
  });

  it('finalActiveStates is populated', () => {
    const r = result('a', 'a');
    expect(r.finalActiveStates.length).toBeGreaterThan(0);
  });

  it('rejectionReason is undefined when accepted', () => {
    const r = result('a', 'a');
    expect(r.accepted).toBe(true);
    expect(r.rejectionReason).toBeUndefined();
  });

  it('rejectionReason is set when rejected', () => {
    const r = result('a', 'b');
    expect(r.accepted).toBe(false);
    expect(r.rejectionReason).toBeTruthy();
  });
});

// ─── Final accepting via ε-transitions ───────────────────────────────────────

describe('simulate: accepting state reachable through ε', () => {
  it('(a|b)*abb: accepting state may be ε-reachable — check via simulate', () => {
    // Indirect test: the accepted result confirms ε-reachability worked
    expect(accepts('(a|b)*abb', 'abb')).toBe(true);
  });

  it('a* accepts "" because accepting state is ε-reachable from start', () => {
    expect(accepts('a*', '')).toBe(true);
  });
});

// ─── Long inputs ──────────────────────────────────────────────────────────────

describe('simulate: long inputs', () => {
  it('a* accepts 1000 a\'s without timeout', () => {
    const start = Date.now();
    const r = accepts('a*', 'a'.repeat(1000));
    expect(Date.now() - start).toBeLessThan(500);
    expect(r).toBe(true);
  });

  it('(a|b)*abb accepts a 50-char string ending in abb', () => {
    const prefix = 'a'.repeat(47);
    expect(accepts('(a|b)*abb', `${prefix}abb`)).toBe(true);
  });
});
