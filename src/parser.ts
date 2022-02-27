import {
  AssignAST,
  AST,
  BinaryAST,
  BoolAST,
  CallAST,
  IfAST,
  LambdaAST,
  LetAST,
  ProgAST,
  VarAST,
  VarDef,
  VarName,
} from "./ast";
import type { TokenStream } from "./token-stream";
import { Char, ParserFn } from "./types";

var FALSE: BoolAST = { type: "bool", value: false };

function parse(input: TokenStream) {
  var PRECEDENCE = {
    "=": 1,
    "||": 2,
    "&&": 3,
    "<": 7,
    ">": 7,
    "<=": 7,
    ">=": 7,
    "==": 7,
    "!=": 7,
    "+": 10,
    "-": 10,
    "*": 20,
    "/": 20,
    "%": 20,
  };

  return parse_toplevel();

  function is_punc(ch?: Char) {
    var tok = input.peek();
    return tok && tok.type == "punc" && (!ch || tok.value == ch) && tok;
  }

  function is_kw(kw?: string) {
    var tok = input.peek();
    return tok && tok.type == "kw" && (!kw || tok.value == kw) && tok;
  }

  function is_op(op?: string) {
    var tok = input.peek();
    return tok && tok.type == "op" && (!op || tok.value == op) && tok;
  }

  function skip_punc(ch: Char) {
    if (is_punc(ch)) input.next();
    else input.croak('Expecting punctuation: "' + ch + '"');
  }

  function skip_kw(kw: string) {
    if (is_kw(kw)) input.next();
    else input.croak('Expecting keyword: "' + kw + '"');
  }

  function skip_op(op: string) {
    if (is_op(op)) input.next();
    else input.croak('Expecting operator: "' + op + '"');
  }

  function unexpected(): never {
    throw input.croak("Unexpected token: " + JSON.stringify(input.peek()));
  }

  function maybe_binary(left: AST, my_prec: number): AST {
    var tok = is_op();
    if (tok) {
      var his_prec = PRECEDENCE[tok.value];

      if (his_prec > my_prec) {
        input.next();
        const ast: BinaryAST | AssignAST =
          tok.value === "="
            ? {
                type: "assign",
                operator: tok.value,
                left,
                right: maybe_binary(parse_atom(), his_prec),
              }
            : {
                type: "binary",
                operator: tok.value,
                left,
                right: maybe_binary(parse_atom(), his_prec),
              };

        return maybe_binary(ast, my_prec);
      }
    }
    return left;
  }

  function delimited<T>(
    start: Char,
    stop: Char,
    separator: Char,
    parser: ParserFn<T>
  ): T[] {
    var a = [],
      first = true;
    skip_punc(start);
    while (!input.eof()) {
      if (is_punc(stop)) break;
      if (first) first = false;
      else skip_punc(separator);
      if (is_punc(stop)) break;
      a.push(parser());
    }
    skip_punc(stop);
    return a;
  }

  function parse_call(func: AST): CallAST {
    return {
      type: "call",
      func: func,
      args: delimited("(", ")", ",", parse_expression),
    };
  }

  function parse_varname(): VarName {
    var name = input.next();

    if (!name || name.type != "var") input.croak("Expecting variable name");

    return name.value as VarName;
  }

  function parse_if(): IfAST {
    skip_kw("if");
    var cond = parse_expression();
    if (!is_punc("{")) skip_kw("then");
    var then = parse_expression();
    var ret: IfAST = {
      type: "if",
      cond: cond,
      then: then,
    };

    if (is_kw("else")) {
      input.next();
      ret.else = parse_expression();
    }
    return ret;
  }

  function parse_lambda(): LambdaAST {
    return {
      type: "lambda",
      name: input.peek()?.type === "var" ? String(input.next().value) : null,
      vars: delimited("(", ")", ",", parse_varname),
      body: parse_expression(),
    };
  }

  function parse_bool(): BoolAST {
    return {
      type: "bool",
      value: input.next().value == "true",
    };
  }

  function parse_let(): CallAST | LetAST {
    skip_kw("let");
    if (input.peek()?.type === "var") {
      var name = input.next().value;
      var defs = delimited("(", ")", ",", parse_vardef);
      return {
        type: "call",
        func: {
          type: "lambda",
          name: String(name),
          vars: defs.map(function (def) {
            return def.name;
          }),
          body: parse_expression(),
        },
        args: defs.map(function (def) {
          return def.def || FALSE;
        }),
      };
    }
    return {
      type: "let",
      vars: delimited("(", ")", ",", parse_vardef),
      body: parse_expression(),
    };
  }

  function parse_vardef(): VarDef {
    var name = parse_varname(),
      def;
    if (is_op("=")) {
      input.next();
      def = parse_expression();
      return { name: name, def: def };
    } else {
      throw input.croak(
        `Expected token '='. Received: '${input.peek()?.value}'`
      );
    }
  }

  function maybe_call(expr: () => AST): AST {
    let _expr = expr();
    return is_punc("(") ? parse_call(_expr) : _expr;
  }

  function parse_atom(): AST {
    return maybe_call(function () {
      if (is_punc("(")) {
        input.next();
        var exp = parse_expression();
        skip_punc(")");
        return exp;
      }
      if (is_punc("{")) return parse_prog();
      if (is_kw("if")) return parse_if();
      if (is_kw("true") || is_kw("false")) return parse_bool();
      if (is_kw("lambda") || is_kw("λ")) {
        input.next();
        return parse_lambda();
      }
      if (is_kw("let")) return parse_let();

      var tok = input.next();
      if (tok.type == "var" || tok.type == "num" || tok.type == "str")
        return tok as AST;

      unexpected();
    });
  }

  function parse_toplevel(): ProgAST {
    var prog = [];
    while (!input.eof()) {
      prog.push(parse_expression());
      if (!input.eof()) skip_punc(";");
    }
    return { type: "prog", prog: prog };
  }

  function parse_prog(): AST {
    var prog = delimited("{", "}", ";", parse_expression);
    if (prog.length == 0) return FALSE;
    if (prog.length == 1) return prog[0];
    return { type: "prog", prog: prog };
  }

  function parse_expression(): AST {
    return maybe_call(function () {
      return maybe_binary(parse_atom(), 0);
    });
  }
}

export default parse;
