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
  var current: Token | null = null;
  var keywords = " let if then else lambda λ true false ";

  return {
    next: next,
    peek: peek,
    eof: eof,
    croak: input.croak,
  };

  function is_keyword(x: string) {
    return keywords.indexOf(" " + x + " ") >= 0;
  }

  function is_digit(ch: Char) {
    return /[0-9]/i.test(ch);
  }

  function is_id_start(ch: Char) {
    return /[a-zλ_]/i.test(ch);
  }

  function is_id(ch: Char) {
    return is_id_start(ch) || "?!-<>=0123456789".indexOf(ch) >= 0;
  }

  function is_op_char(ch: Char) {
    return "+-*/%=&|<>!".indexOf(ch) >= 0;
  }

  function is_punc(ch: Char) {
    return ",;(){}[]".indexOf(ch) >= 0;
  }

  function is_whitespace(ch: Char) {
    return " \t\n".indexOf(ch) >= 0;
  }

  function read_while(predicate: Predicate) {
    var str = "";
    while (!input.eof() && predicate(input.peek())) str += input.next();
    return str;
  }

  function read_number(): NumToken {
    var has_dot = false;
    var number = read_while(function (ch) {
      if (ch == ".") {
        if (has_dot) return false;
        has_dot = true;
        return true;
      }
      return is_digit(ch);
    });
    return { type: "num", value: parseFloat(number) };
  }

  function read_ident(): KwToken | VarToken {
    var id = read_while(is_id);
    return {
      type: is_keyword(id) ? "kw" : "var",
      value: id,
    };
  }

  function read_escaped(end: Char) {
    var escaped = false,
      str = "";
    input.next();
    while (!input.eof()) {
      var ch = input.next();
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

  function read_string(): StrToken {
    return { type: "str", value: read_escaped('"') };
  }
  function skip_comment() {
    read_while(function (ch) {
      return ch != "\n";
    });
    input.next();
  }

  function read_next(): Token | null {
    read_while(is_whitespace);
    if (input.eof()) return null;
    var ch = input.peek();
    if (ch == "#") {
      skip_comment();
      return read_next();
    }
    if (ch == '"') return read_string();
    if (is_digit(ch)) return read_number();
    if (is_id_start(ch)) return read_ident();
    if (is_punc(ch))
      return {
        type: "punc",
        value: input.next(),
      };
    if (is_op_char(ch))
      return {
        type: "op",
        value: read_while(is_op_char) as Operator,
      };

    throw input.croak("Can't handle character: " + ch);
  }

  function peek(): Token | null {
    return current || (current = read_next());
  }

  function next(): Token {
    var tok = current;
    current = null;
    return tok || (read_next() as Token);
  }

  function eof() {
    return peek() == null;
  }
}

export default TokenStream;

export type TokenStream = ReturnType<typeof TokenStream>;
