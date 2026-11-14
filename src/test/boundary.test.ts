/**
 * boundary.test.ts
 * Suite 6: Boundary cases and error handling.
 *
 * Tests boundary conditions, malformed expressions, error handling,
 * partial matches, epsilon cycles, and edge-case inputs across the engine.
 */

import { describe, it, expect } from 'vitest';
import {
  tokenize,
  parse,
  buildNFA,
  simulate,
  compileRegex,
  compileAndSimulate,
  isTokenizeError,
  isParseError,
} from '../engine/index.js';
import type { NFA, SimulationResult } from '../engine/index.js';

function compile(raw: string): NFA {
  const nfa = compileRegex(raw);
  if (isTokenizeError(nfa)) throw new Error(`Tokenize error: ${nfa.message}`);
  if (isParseError(nfa)) throw new Error(`Parse error: ${nfa.message}`);
  return nfa;
}

function sim(regex: string, input: string): SimulationResult {
  const result = compileAndSimulate(regex, input);
  if (isTokenizeError(result) || isParseError(result)) {
    throw new Error(`Compile error: ${result.message}`);
  }
  return result;
}

// ─── 1. Empty Expressions & Whitespace ──────────────────────────────────────

describe('boundary: empty expressions and whitespace', () => {
  it('empty string is a validation error, not epsilon', () => {
    const err = compileRegex('');
    expect(isTokenizeError(err)).toBe(true);
    if (isTokenizeError(err)) {
      expect(err.message).toMatch(/enter a regular expression/i);
    }
  });

  it('spaces and tabs only is a validation error', () => {
    const err = compileRegex('   \t  \n ');
    expect(isTokenizeError(err)).toBe(true);
  });

  it('embedded whitespace in valid expressions is stripped', () => {
    const nfa1 = compile('a  b');
    const nfa2 = compile('ab');
    expect(nfa1.states.length).toBe(nfa2.states.length);
    expect(sim('a b', 'ab').accepted).toBe(true);
  });
});

// ─── 2. Unsupported Operators & Clear Errors ────────────────────────────────

describe('boundary: unsupported operators produce actionable errors', () => {
  it('+ produces actionable message suggesting aa*', () => {
    const err = compileRegex('a+');
    expect(isTokenizeError(err)).toBe(true);
    if (isTokenizeError(err)) {
      expect(err.message).toMatch(/\+/);
      expect(err.message).toMatch(/aa\*/);
    }
  });

  it('? produces actionable message suggesting (a|E)', () => {
    const err = compileRegex('a?');
    expect(isTokenizeError(err)).toBe(true);
    if (isTokenizeError(err)) {
      expect(err.message).toMatch(/\?/);
      expect(err.message).toMatch(/\(a\|E\)/);
    }
  });

  it('wildcard . produces unsupported error', () => {
    const err = compileRegex('a.b');
    expect(isTokenizeError(err)).toBe(true);
    if (isTokenizeError(err)) {
      expect(err.message).toMatch(/wildcard/i);
    }
  });

  it('character classes [...] produce unsupported error', () => {
    const err = compileRegex('[a-z]');
    expect(isTokenizeError(err)).toBe(true);
  });

  it('escape backslash produces unsupported error', () => {
    const err = compileRegex('a\\b');
    expect(isTokenizeError(err)).toBe(true);
  });
});

// ─── 3. Malformed Expressions & Structured Errors ───────────────────────────

describe('boundary: malformed expressions and parser errors', () => {
  it('leading star *a produces structured ParseError', () => {
    const err = compileRegex('*a');
    expect(isParseError(err)).toBe(true);
    if (isParseError(err)) {
      expect(err.message).toMatch(/must follow an operand/i);
      expect(err.position).toBe(0);
    }
  });

  it('star alone * produces structured ParseError', () => {
    const err = compileRegex('*');
    expect(isParseError(err)).toBe(true);
  });

  it('leading union |a produces ParseError', () => {
    const err = compileRegex('|a');
    expect(isParseError(err)).toBe(true);
  });

  it('trailing union a| produces ParseError with position', () => {
    const err = compileRegex('a|');
    expect(isParseError(err)).toBe(true);
    if (isParseError(err)) {
      expect(err.message).toMatch(/missing right operand/i);
    }
  });

  it('consecutive unions a||b produces ParseError', () => {
    const err = compileRegex('a||b');
    expect(isParseError(err)).toBe(true);
  });

  it('unmatched opening parenthesis (ab produces ParseError', () => {
    const err = compileRegex('(ab');
    expect(isParseError(err)).toBe(true);
    if (isParseError(err)) {
      expect(err.message).toMatch(/unmatched opening parenthesis/i);
    }
  });

  it('unmatched closing parenthesis ab) produces ParseError', () => {
    const err = compileRegex('ab)');
    expect(isParseError(err)).toBe(true);
    if (isParseError(err)) {
      expect(err.message).toMatch(/closing parenthesis/i);
    }
  });

  it('nested unmatched parenthesis ((a|b) produces ParseError', () => {
    const err = compileRegex('((a|b)');
    expect(isParseError(err)).toBe(true);
  });

  it('union with empty branch in parens (a|) produces ParseError', () => {
    const err = compileRegex('(a|)');
    expect(isParseError(err)).toBe(true);
  });
});

// ─── 4. Nested Grouping & Repeated Star ──────────────────────────────────────

describe('boundary: nested grouping and repetition', () => {
  it('empty parentheses () treated as epsilon', () => {
    expect(sim('()', '').accepted).toBe(true);
    expect(sim('()', 'a').accepted).toBe(false);
  });

  it('deeply nested parentheses (((a))) behaves as a', () => {
    expect(sim('(((a)))', 'a').accepted).toBe(true);
    expect(sim('(((a)))', 'b').accepted).toBe(false);
  });

  it('double star a** behaves as a*', () => {
    expect(sim('a**', '').accepted).toBe(true);
    expect(sim('a**', 'a').accepted).toBe(true);
    expect(sim('a**', 'aaa').accepted).toBe(true);
    expect(sim('a**', 'b').accepted).toBe(false);
  });

  it('star applied to epsilon E* accepts empty string and rejects non-empty', () => {
    expect(sim('E*', '').accepted).toBe(true);
    expect(sim('E*', 'a').accepted).toBe(false);
    expect(sim('ε*', '').accepted).toBe(true);
    expect(sim('ε*', 'a').accepted).toBe(false);
  });

  it('nested star ((a)*)* behaves as a*', () => {
    expect(sim('((a)*)*', '').accepted).toBe(true);
    expect(sim('((a)*)*', 'aaaa').accepted).toBe(true);
    expect(sim('((a)*)*', 'b').accepted).toBe(false);
  });
});

// ─── 5. Epsilon Cycles & Safe Termination ────────────────────────────────────

describe('boundary: epsilon cycles and termination', () => {
  it('(E)* terminates without infinite loop and accepts empty string', () => {
    const start = Date.now();
    const res = sim('(E)*', '');
    expect(Date.now() - start).toBeLessThan(100);
    expect(res.accepted).toBe(true);
  });

  it('((E|E)*)* terminates without infinite loop', () => {
    const start = Date.now();
    const res = sim('((E|E)*)*', '');
    expect(Date.now() - start).toBeLessThan(100);
    expect(res.accepted).toBe(true);
  });

  it('(a|E)* terminates and accepts both empty and repetition of a', () => {
    expect(sim('(a|E)*', '').accepted).toBe(true);
    expect(sim('(a|E)*', 'a').accepted).toBe(true);
    expect(sim('(a|E)*', 'aaa').accepted).toBe(true);
    expect(sim('(a|E)*', 'b').accepted).toBe(false);
  });
});

// ─── 6. Simulation Edge Cases: Partial Matches & Missing Transitions ────────

describe('boundary: simulation partial matches and dead states', () => {
  it('partial match where prefix matches but extra input remains is rejected', () => {
    // regex: 'ab', input: 'aba' -> after 'ab' we are at accept, but 'a' has no transition
    const res = sim('ab', 'aba');
    expect(res.accepted).toBe(false);
    expect(res.rejectionReason).toMatch(/no transition/i);
  });

  it('prefix only matching is rejected', () => {
    // regex: 'ab', input: 'a' -> consumed all input, but not at accept state
    const res = sim('ab', 'a');
    expect(res.accepted).toBe(false);
    expect(res.rejectionReason).toMatch(/do not include any accepting state/i);
  });

  it('missing transition immediately empties active states and halts', () => {
    const res = sim('a', 'z');
    expect(res.accepted).toBe(false);
    expect(res.finalActiveStates).toEqual([]);
    expect(res.rejectionReason).toMatch(/no transition on 'z'/i);
  });

  it('input symbol not in alphabet cleanly rejects', () => {
    const res = sim('a|b', 'x');
    expect(res.accepted).toBe(false);
  });
});

// ─── 7. Final State Reachable Exclusively Through Epsilon ───────────────────

describe('boundary: accepting state reachable via epsilon', () => {
  it('aE: accepting state reached via epsilon after consuming a', () => {
    const res = sim('aE', 'a');
    expect(res.accepted).toBe(true);
    expect(sim('aE', '').accepted).toBe(false);
  });

  it('E|a accepts empty input because accepting state reached via epsilon at start', () => {
    const res = sim('E|a', '');
    expect(res.accepted).toBe(true);
  });

  it('(a|b)*abb accepts abb with correct trace', () => {
    const res = sim('(a|b)*abb', 'abb');
    expect(res.accepted).toBe(true);
    expect(res.steps.length).toBe(4); // step 0 (init) + step 1 ('a') + step 2 ('b') + step 3 ('b')
  });
});

// ─── 8. Long Inputs & Stress Testing ─────────────────────────────────────────

describe('boundary: long inputs and performance', () => {
  it('handles 500 repetitions on a* cleanly', () => {
    const longA = 'a'.repeat(500);
    const start = Date.now();
    const res = sim('a*', longA);
    expect(Date.now() - start).toBeLessThan(500);
    expect(res.accepted).toBe(true);
  });

  it('handles alternation over large input on (0|1)*', () => {
    const bitstring = '0110100101101001'.repeat(10);
    const res = sim('(0|1)*', bitstring);
    expect(res.accepted).toBe(true);
  });
});
