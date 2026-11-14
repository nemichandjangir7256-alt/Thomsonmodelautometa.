/**
 * parser.ts
 * Recursive-descent parser for the Thompson Automata regex grammar.
 *
 * Grammar (from PROJECT_SPEC §2.4):
 *
 *   regex  ::= union
 *   union  ::= concat ( '|' concat )*           -- left-to-right, lowest precedence
 *   concat ::= star ( star )*                   -- left-to-right implicit concatenation
 *   star   ::= atom '*'*                        -- postfix, applied right-to-left
 *   atom   ::= SYMBOL | EPSILON | '(' regex ')'
 *
 * The parser returns an ASTNode (success) or ParseError (failure).
 * It never throws uncaught exceptions.
 */

import type { Token, ASTNode, ParseError, ParseResult } from './types.js';

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse a validated token stream (from tokenize()) into an AST.
 * The tokens array MUST end with an EOF sentinel.
 */
export function parse(tokens: Token[]): ParseResult {
  const parser = new Parser(tokens);
  return parser.parse();
}

// ─── Parser class ────────────────────────────────────────────────────────────

class Parser {
  private readonly tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  // ── Entry point ────────────────────────────────────────────────────────────

  parse(): ParseResult {
    const result = this.parseUnion();
    if (isParseError(result)) return result;

    // There should be nothing left except EOF
    if (this.current().type !== 'EOF') {
      const tok = this.current();
      if (tok.type === 'RPAREN') {
        return err(`Unexpected closing parenthesis ')'.`, tok.position);
      }
      return err(`Unexpected token '${tok.value}' at position ${tok.position}.`, tok.position);
    }

    return result;
  }

  // ── union ::= concat ( '|' concat )* ─────────────────────────────────────

  private parseUnion(): ParseResult {
    let left = this.parseConcat();
    if (isParseError(left)) return left;

    while (this.current().type === 'UNION') {
      const unionTok = this.consume(); // consume '|'

      // Detect trailing '|' — nothing valid can follow
      if (
        this.current().type === 'EOF' ||
        this.current().type === 'RPAREN'
      ) {
        return err(
          `Missing right operand for union operator '|' at position ${unionTok.position}.`,
          unionTok.position,
        );
      }

      const right = this.parseConcat();
      if (isParseError(right)) return right;

      left = { kind: 'Union', left, right } satisfies ASTNode;
    }

    return left;
  }

  // ── concat ::= star ( star )* ─────────────────────────────────────────────
  // An atom can start with: SYMBOL, EPSILON, LPAREN.
  // Concatenation continues while the next token is one of these.

  private parseConcat(): ParseResult {
    let left = this.parseStar();
    if (isParseError(left)) return left;

    while (this.isConcatStart()) {
      const right = this.parseStar();
      if (isParseError(right)) return right;

      left = { kind: 'Concat', left, right } satisfies ASTNode;
    }

    return left;
  }

  /** Returns true if the current token can begin a new atom (start of concat). */
  private isConcatStart(): boolean {
    const t = this.current().type;
    return t === 'SYMBOL' || t === 'EPSILON' || t === 'LPAREN';
  }

  // ── star ::= atom '*'* ────────────────────────────────────────────────────

  private parseStar(): ParseResult {
    // Leading star without an operand
    if (this.current().type === 'STAR') {
      return err(
        `Kleene star '*' must follow an operand (found '*' at position ${this.current().position}).`,
        this.current().position,
      );
    }

    let node = this.parseAtom();
    if (isParseError(node)) return node;

    // Consume any number of trailing stars (a** is treated the same as a*)
    while (this.current().type === 'STAR') {
      this.consume();
      node = { kind: 'Star', operand: node } satisfies ASTNode;
    }

    return node;
  }

  // ── atom ::= SYMBOL | EPSILON | '(' regex ')' ─────────────────────────────

  private parseAtom(): ParseResult {
    const tok = this.current();

    if (tok.type === 'SYMBOL') {
      this.consume();
      return { kind: 'Symbol', value: tok.value };
    }

    if (tok.type === 'EPSILON') {
      this.consume();
      return { kind: 'Epsilon' };
    }

    if (tok.type === 'LPAREN') {
      this.consume(); // consume '('

      if (this.current().type === 'EOF') {
        return err(`Unmatched opening parenthesis '(' at position ${tok.position}.`, tok.position);
      }

      // Allow empty parens to be epsilon: () == E
      if (this.current().type === 'RPAREN') {
        this.consume(); // consume ')'
        return { kind: 'Epsilon' };
      }

      const inner = this.parseUnion();
      if (isParseError(inner)) return inner;

      if (this.current().type !== 'RPAREN') {
        return err(`Unmatched opening parenthesis '(' at position ${tok.position}.`, tok.position);
      }
      this.consume(); // consume ')'
      return inner;
    }

    if (tok.type === 'EOF') {
      return err('Unexpected end of expression.', tok.position);
    }

    if (tok.type === 'RPAREN') {
      return err(`Unexpected closing parenthesis ')' at position ${tok.position}.`, tok.position);
    }

    return err(`Unexpected token '${tok.value}' at position ${tok.position}.`, tok.position);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private current(): Token {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const tok = this.tokens[this.pos];
    this.pos++;
    return tok;
  }
}

// ─── Private helpers ─────────────────────────────────────────────────────────

function err(message: string, position: number): ParseError {
  return { kind: 'ParseError', message, position };
}

function isParseError(v: ParseResult): v is ParseError {
  return (v as ParseError).kind === 'ParseError';
}
