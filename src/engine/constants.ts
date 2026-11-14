/**
 * constants.ts
 * Global constants for the Thompson Automata engine.
 * Import EPSILON_SYMBOL from here — never hardcode the string elsewhere.
 */

/** The canonical internal representation of an epsilon transition label. */
export const EPSILON_SYMBOL = 'ε';

/**
 * Characters that are reserved as operators and may NOT appear as ordinary
 * alphabet symbols in a regular expression.
 */
export const RESERVED_CHARS: ReadonlySet<string> = new Set([
  '(',
  ')',
  '|',
  '*',
  'E',  // ASCII alias for epsilon
  'ε',  // Greek epsilon U+03B5
]);

/**
 * Characters that are recognised as unsupported operators.
 * Each entry maps the character to a helpful error message.
 */
export const UNSUPPORTED_OPERATORS: ReadonlyMap<string, string> = new Map([
  ['+', "'+' is not a supported operator. Use 'aa*' for one-or-more."],
  ['?', "'?' is not a supported operator. Use '(a|E)' for zero-or-one."],
  ['.', "'.' (wildcard) is not supported in this implementation."],
  ['^', "'^' (anchor) is not supported in this implementation."],
  ['$', "'$' (anchor) is not supported in this implementation."],
  ['\\', "'\\' (escape) is not supported in this implementation."],
  ['[', "'[' (character class) is not supported in this implementation."],
  [']', "']' (character class) is not supported in this implementation."],
  ['{', "'{' (bounded repetition) is not supported in this implementation."],
  ['}', "'}' (bounded repetition) is not supported in this implementation."],
]);

/** The ASCII alias that the tokenizer recognises as epsilon. */
export const EPSILON_ASCII_ALIAS = 'E';

/** The Unicode epsilon character (U+03B5). */
export const EPSILON_UNICODE = 'ε';
