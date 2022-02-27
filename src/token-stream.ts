import type { InputStream } from "./input-stream";
import { Char, Operator, Predicate } from "./types";

type PuncToken = { type: "punc"; value: Char }; // punctuation: parens, comma, semicolon etc.
type NumToken = { type: "num"; value: number }; // numbers
type StrToken = { type: "str"; value: string }; // strings
type KwToken = { type: "kw"; value: string }; // keywords
type VarToken = { type: "var"; value: string }; // identifiers
type OpToken = { type: "op"; value: Operator }; // operators

export type Token =
  | PuncToken
  | NumToken
  | StrToken
  | KwToken
  | VarToken
  | OpToken;

function TokenStream(input: InputStream) {
  let current: Token | null = null;
  const keywords = " let if then else lambda λ true false ";

  return {
    next: next,
    peek: peek,
    eof: eof,
    croak: input.croak,
  };

  function isKeyword(x: string) {
    return keywords.indexOf(" " + x + " ") >= 0;
  }

  function isDigit(ch: Char) {
    return /[0-9]/i.test(ch);
  }

  function isIdStart(ch: Char) {
    return /[a-zλ_]/i.test(ch);
  }

  function isIdentifier(ch: Char) {
    return isIdStart(ch) || "?!-<>=0123456789".indexOf(ch) >= 0;
  }

  function isOpChar(ch: Char) {
    return "+-*/%=&|<>!".indexOf(ch) >= 0;
  }

  function isPunc(ch: Char) {
    return ",;(){}[]".indexOf(ch) >= 0;
  }

  function isWhitespace(ch: Char) {
    return " \t\n".indexOf(ch) >= 0;
  }

  function readWhile(predicate: Predicate) {
    let str = "";
    while (!input.eof() && predicate(input.peek())) str += input.next();
    return str;
  }

  function readNumber(): NumToken {
    let hasDot = false;
    const number = readWhile((ch) => {
      if (ch == ".") {
        if (hasDot) return false;
        hasDot = true;
        return true;
      }
      return isDigit(ch);
    });

    return { type: "num", value: parseFloat(number) };
  }

  function readIdent(): KwToken | VarToken {
    const id = readWhile(isIdentifier);
    return {
      type: isKeyword(id) ? "kw" : "var",
      value: id,
    };
  }

  function readEscaped(end: Char) {
    let escaped = false;
    let str = "";
    input.next();

    while (!input.eof()) {
      const ch = input.next();
      if (escaped) {
        str += ch;
        escaped = false;
      } else if (ch == "\\") {
        escaped = true;
      } else if (ch == end) {
        break;
      } else {
        str += ch;
      }
    }
    return str;
  }

  function readString(): StrToken {
    return { type: "str", value: readEscaped('"') };
  }

  function skipComment() {
    readWhile((ch) => {
      return ch != "\n";
    });
    input.next();
  }

  function readNext(): Token | null {
    readWhile(isWhitespace);
    if (input.eof()) return null;

    const ch = input.peek();
    if (ch == "#") {
      skipComment();
      return readNext();
    }
    if (ch == '"') return readString();
    if (isDigit(ch)) return readNumber();
    if (isIdStart(ch)) return readIdent();
    if (isPunc(ch))
      return {
        type: "punc",
        value: input.next(),
      };
    if (isOpChar(ch))
      return {
        type: "op",
        value: readWhile(isOpChar) as Operator,
      };

    throw input.croak("Can't handle character: " + ch);
  }

  function peek(): Token | null {
    return current || (current = readNext());
  }

  function next(): Token {
    var tok = current;
    current = null;
    return tok || (readNext() as Token);
  }

  function eof() {
    return peek() == null;
  }
}

export default TokenStream;

export type TokenStream = ReturnType<typeof TokenStream>;
