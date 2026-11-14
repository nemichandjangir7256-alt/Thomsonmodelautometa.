/**
 * tokenizer.ts
 * Lexes a raw regular-expression string into a validated token stream.
 *
 * Responsibilities:
 *  1. Strip ASCII whitespace (space, tab, newline, CR).
 *  2. Reject an empty stripped string with a helpful message.
 *  3. Reject unsupported operator characters with position-aware messages.
 *  4. Normalise both 'E' and 'ε' to Token { type: 'EPSILON', value: 'ε' }.
 *  5. Produce Token[] or TokenizeError — never throw.
 */

import {
  EPSILON_SYMBOL,
  EPSILON_ASCII_ALIAS,
  EPSILON_UNICODE,
  UNSUPPORTED_OPERATORS,
} from './constants.js';
import type {
  Token,
  TokenType,
  TokenizeError,
  TokenizeResult,
} from './types.js';

/** Characters that map directly to a fixed TokenType. */
const OPERATOR_TOKEN_TYPES: ReadonlyMap<string, TokenType> = new Map([
  ['|', 'UNION'],
  ['*', 'STAR'],
  ['(', 'LPAREN'],
  [')', 'RPAREN'],
]);

/**
 * Tokenise `raw` into an array of Tokens (followed by an EOF sentinel),
 * or return a TokenizeError describing the first problem found.
 */
export function tokenize(raw: string): TokenizeResult {
  // ── 1. Strip whitespace ───────────────────────────────────────────────────
  const stripped = raw.replace(/[ \t\r\n]/g, '');

  // ── 2. Empty input ────────────────────────────────────────────────────────
  if (stripped.length === 0) {
    return {
      kind: 'TokenizeError',
      message: 'Please enter a regular expression.',
      position: 0,
    };
  }

  const tokens: Token[] = [];

  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];

    // ── 3. Unsupported operators ───────────────────────────────────────────
    const unsupportedMsg = UNSUPPORTED_OPERATORS.get(ch);
    if (unsupportedMsg !== undefined) {
      return { kind: 'TokenizeError', message: unsupportedMsg, position: i };
    }

    // ── 4. Epsilon normalisation ───────────────────────────────────────────
    if (ch === EPSILON_ASCII_ALIAS || ch === EPSILON_UNICODE) {
      tokens.push({ type: 'EPSILON', value: EPSILON_SYMBOL, position: i });
      continue;
    }

    // ── 5. Operator characters ─────────────────────────────────────────────
    const opType = OPERATOR_TOKEN_TYPES.get(ch);
    if (opType !== undefined) {
      tokens.push({ type: opType, value: ch, position: i });
      continue;
    }

    // ── 6. Validate as a printable, non-control ASCII symbol ───────────────
    const code = ch.codePointAt(0) ?? 0;
    // Allow any printable character that is not a control character (code > 32)
    // and is not already handled above. This covers a-z, 0-9, and punctuation.
    if (code <= 32) {
      return {
        kind: 'TokenizeError',
        message: `Unexpected character at position ${i}: '${ch}'.`,
        position: i,
      };
    }

    tokens.push({ type: 'SYMBOL', value: ch, position: i });
  }

  // EOF sentinel
  tokens.push({ type: 'EOF', value: '', position: stripped.length });

  return tokens;
}

/**
 * Helper: tokenise and throw on error (for use inside the parser which
 * expects a pre-validated token stream). Not exported from the engine index.
 */
export function tokenizeOrThrow(raw: string): Token[] {
  const result = tokenize(raw);
  if (!Array.isArray(result)) {
    throw new Error(result.message);
  }
  return result;
}
