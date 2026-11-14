/**
 * tokenizer.test.ts
 * Tests for the lexer / tokenizer module.
 */

import { describe, it, expect } from 'vitest';
import { tokenize } from '../engine/tokenizer.js';
import { isTokenizeError } from '../engine/types.js';
import { EPSILON_SYMBOL } from '../engine/constants.js';

// ─── Helper ───────────────────────────────────────────────────────────────────

function tokens(raw: string) {
  const result = tokenize(raw);
  if (isTokenizeError(result)) throw new Error(`Unexpected error: ${result.message}`);
  return result;
}

function tokenTypes(raw: string): string[] {
  return tokens(raw).map(t => t.type);
}

function error(raw: string) {
  const result = tokenize(raw);
  if (!isTokenizeError(result)) throw new Error('Expected a TokenizeError');
  return result;
}

// ─── Empty input ──────────────────────────────────────────────────────────────

describe('tokenize: empty input', () => {
  it('returns an error for an empty string', () => {
    const e = error('');
    expect(e.kind).toBe('TokenizeError');
    expect(e.message).toMatch(/enter a regular expression/i);
  });

  it('returns an error for a whitespace-only string', () => {
    const e = error('   \t\n');
    expect(e.kind).toBe('TokenizeError');
    expect(e.message).toMatch(/enter a regular expression/i);
  });
});

// ─── Epsilon normalisation ────────────────────────────────────────────────────

describe('tokenize: epsilon normalisation', () => {
  it('normalises uppercase E to EPSILON token with value ε', () => {
    const t = tokens('E');
    expect(t[0].type).toBe('EPSILON');
    expect(t[0].value).toBe(EPSILON_SYMBOL);
  });

  it('normalises Greek ε to EPSILON token with value ε', () => {
    const t = tokens('ε');
    expect(t[0].type).toBe('EPSILON');
    expect(t[0].value).toBe(EPSILON_SYMBOL);
  });

  it('both E and ε normalise to the same token type and value', () => {
    const fromE = tokens('E')[0];
    const fromEps = tokens('ε')[0];
    expect(fromE.type).toBe(fromEps.type);
    expect(fromE.value).toBe(fromEps.value);
  });

  it('E is not treated as an ordinary symbol', () => {
    const t = tokens('E');
    expect(t[0].type).not.toBe('SYMBOL');
  });
});

// ─── Operator tokens ──────────────────────────────────────────────────────────

describe('tokenize: operator tokens', () => {
  it('tokenises | as UNION', () => expect(tokenTypes('a|b')).toContain('UNION'));
  it('tokenises * as STAR', () => expect(tokenTypes('a*')).toContain('STAR'));
  it('tokenises ( as LPAREN', () => expect(tokenTypes('(a)')).toContain('LPAREN'));
  it('tokenises ) as RPAREN', () => expect(tokenTypes('(a)')).toContain('RPAREN'));
  it('appends an EOF sentinel', () => {
    const t = tokens('a');
    expect(t[t.length - 1].type).toBe('EOF');
  });
});

// ─── Symbol tokens ────────────────────────────────────────────────────────────

describe('tokenize: symbol tokens', () => {
  it('tokenises lowercase letters as SYMBOL', () => {
    const t = tokens('abc');
    expect(t.slice(0, 3).every(tk => tk.type === 'SYMBOL')).toBe(true);
  });

  it('tokenises digits as SYMBOL', () => {
    expect(tokens('123')[0].type).toBe('SYMBOL');
  });

  it('records the correct character value', () => {
    const t = tokens('x');
    expect(t[0].value).toBe('x');
  });

  it('records positions correctly', () => {
    const t = tokens('ab');
    expect(t[0].position).toBe(0);
    expect(t[1].position).toBe(1);
  });

  it('strips whitespace before recording positions', () => {
    // After stripping: "ab" at positions 0,1
    const t = tokens(' a b ');
    expect(t[0].value).toBe('a');
    expect(t[0].position).toBe(0);
    expect(t[1].value).toBe('b');
    expect(t[1].position).toBe(1);
  });
});

// ─── Unsupported operators ────────────────────────────────────────────────────

describe('tokenize: unsupported operators', () => {
  const cases: [string, RegExp][] = [
    ['a+', /\+/],
    ['a?', /\?/],
    ['a.b', /\./],
    ['a^b', /\^/],
    ['a$', /\$/],
    ['a\\b', /\\/],
    ['[ab]', /\[/],
    ['{2}', /\{/],
  ];

  for (const [input, pattern] of cases) {
    it(`rejects '${input}'`, () => {
      const e = error(input);
      expect(e.kind).toBe('TokenizeError');
      expect(e.message).toMatch(pattern);
    });
  }
});

// ─── Complex expressions ──────────────────────────────────────────────────────

describe('tokenize: complex expressions', () => {
  it('tokenises (a|b)*abb correctly', () => {
    const types = tokenTypes('(a|b)*abb');
    expect(types).toEqual([
      'LPAREN', 'SYMBOL', 'UNION', 'SYMBOL', 'RPAREN',
      'STAR', 'SYMBOL', 'SYMBOL', 'SYMBOL', 'EOF',
    ]);
  });

  it('tokenises aEb (a, epsilon, b)', () => {
    const t = tokens('aEb');
    expect(t[0].type).toBe('SYMBOL');
    expect(t[1].type).toBe('EPSILON');
    expect(t[2].type).toBe('SYMBOL');
  });
});
