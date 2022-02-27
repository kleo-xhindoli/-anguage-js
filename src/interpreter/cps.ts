import { AST, LambdaAST } from "../ast";
import Environment from "./shared/environment";
import { applyOp } from "./shared/utils";

function evaluate(
  expr: AST,
  env: Environment,
  callback: (exprResult: any) => void
) {
  GUARD(evaluate, arguments);
  switch (expr.type) {
    case "num":
    case "str":
    case "bool":
      callback(expr.value);
      return;

    case "var":
      callback(env.get(expr.value));
      return;

    case "assign":
      const leftExpr = expr.left;
      const rightExpr = expr.right;
      if (leftExpr.type != "var")
        throw new Error("Cannot assign to " + JSON.stringify(leftExpr));

      evaluate(rightExpr, env, function CC(right) {
        GUARD(CC, arguments);
        callback(env.set(leftExpr.value, right));
      });
      return;

    case "binary":
      evaluate(expr.left, env, function CC(left) {
        GUARD(CC, arguments);
        evaluate(expr.right, env, function CC(right) {
          GUARD(CC, arguments);
          callback(applyOp(expr.operator, left, right));
        });
      });
      return;

    case "let":
      (function loop(env, i) {
        GUARD(loop, arguments);
        if (i < expr.vars.length) {
          const v = expr.vars[i];
          if (v.def)
            evaluate(v.def, env, function CC(value) {
              GUARD(CC, arguments);
              const scope = env.extend();
              scope.def(v.name, value);
              loop(scope, i + 1);
            });
          else {
            const scope = env.extend();
            scope.def(v.name, false);
            loop(scope, i + 1);
          }
        } else {
          evaluate(expr.body, env, callback);
        }
      })(env, 0);
      return;

    case "lambda":
      callback(makeLambda(env, expr));
      return;

    case "if":
      evaluate(expr.cond, env, function CC(cond) {
        GUARD(CC, arguments);
        if (cond !== false) evaluate(expr.then, env, callback);
        else if (expr.else) evaluate(expr.else, env, callback);
        else callback(false);
      });
      return;

    case "prog":
      (function loop(last, i) {
        GUARD(loop, arguments);
        if (i < expr.prog.length)
          evaluate(expr.prog[i], env, function CC(val) {
            GUARD(CC, arguments);
            loop(val, i + 1);
          });
        else {
          callback(last);
        }
      })(false, 0);
      return;

    case "call":
      evaluate(expr.func, env, function CC(func) {
        GUARD(CC, arguments);
        (function loop(args, i) {
          GUARD(loop, arguments);
          if (i < expr.args.length)
            evaluate(expr.args[i], env, function CC(arg) {
              GUARD(CC, arguments);
              args[i + 1] = arg;
              loop(args, i + 1);
            });
          else {
            func.apply(null, args);
          }
        })([callback], 0);
      });
      return;

    default:
      throw new Error("I don't know how to evaluate " + expr);
  }
}

function makeLambda(env: Environment, exp: LambdaAST) {
  if (exp.name) {
    env = env.extend();
    env.def(exp.name, lambda);
  }
  function lambda(callback: (result: any) => void) {
    GUARD(lambda, arguments); // <-- this
    const names = exp.vars;
    const scope = env.extend();
    for (let i = 0; i < names.length; ++i)
      scope.def(names[i], i + 1 < arguments.length ? arguments[i + 1] : false);
    evaluate(exp.body, scope, callback);
  }
  return lambda;
}

let STACKLEN = 200;
function GUARD(f: Function, args: any) {
  if (--STACKLEN < 0) throw new Continuation(f, args);
}

class Continuation {
  f: Function;
  args: any;

  constructor(f: Function, args: any) {
    this.f = f;
    this.args = args;
  }
}

function Execute(f: Function, args: any) {
  while (true)
    try {
      STACKLEN = 200;
      return f.apply(null, args);
    } catch (ex) {
      if (ex instanceof Continuation) (f = ex.f), (args = ex.args);
      else throw ex;
    }
}

export default function exec(ast: AST, globalEnv: Environment) {
  setGlobals(globalEnv);
  Execute(evaluate, [
    ast,
    globalEnv,
    function (result: any) {
      console.log("*** Result:", result);
    },
  ]);
}

function setGlobals(globalEnv: Environment) {
  globalEnv.def("print", function (k: Function, txt: string) {
    console.log(txt);
    k(false);
  });

  globalEnv.def("println", function (k: Function, txt: string) {
    console.log(txt);
    k(false);
  });

  globalEnv.def("time", function (k: Function, fn: Function) {
    const t1 = Date.now();

    fn(function (result: any) {
      const t2 = Date.now();
      console.log("Time: " + (t2 - t1) + "ms");
      Execute(k, [result]);
    });
  });

  globalEnv.def("halt", function (_: Function) {});

  globalEnv.def("sleep", function (k: Function, milliseconds: number) {
    setTimeout(function () {
      Execute(k, [false]); // continuations expect a value, pass false
    }, milliseconds);
  });

  globalEnv.def("CallCC", function (k: Function, f: Function) {
    f(k, function CC(discarded: Function, ret: any) {
      k(ret);
    });
  });
}
