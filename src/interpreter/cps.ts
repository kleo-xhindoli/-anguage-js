import { AST, LambdaAST } from "../ast";
import Environment from "./shared/environment";
import { apply_op } from "./shared/utils";

function evaluate(
  exp: AST,
  env: Environment,
  callback: (exp_result: any) => void
) {
  GUARD(evaluate, arguments);
  switch (exp.type) {
    case "num":
    case "str":
    case "bool":
      callback(exp.value);
      return;

    case "var":
      callback(env.get(exp.value));
      return;

    case "assign":
      const leftExpr = exp.left;
      const rightExpr = exp.right;
      if (leftExpr.type != "var")
        throw new Error("Cannot assign to " + JSON.stringify(leftExpr));

      evaluate(rightExpr, env, function CC(right) {
        GUARD(CC, arguments);
        callback(env.set(leftExpr.value, right));
      });
      return;

    case "binary":
      evaluate(exp.left, env, function CC(left) {
        GUARD(CC, arguments);
        evaluate(exp.right, env, function CC(right) {
          GUARD(CC, arguments);
          callback(apply_op(exp.operator, left, right));
        });
      });
      return;

    case "let":
      (function loop(env, i) {
        GUARD(loop, arguments);
        if (i < exp.vars.length) {
          var v = exp.vars[i];
          if (v.def)
            evaluate(v.def, env, function CC(value) {
              GUARD(CC, arguments);
              var scope = env.extend();
              scope.def(v.name, value);
              loop(scope, i + 1);
            });
          else {
            var scope = env.extend();
            scope.def(v.name, false);
            loop(scope, i + 1);
          }
        } else {
          evaluate(exp.body, env, callback);
        }
      })(env, 0);
      return;

    case "lambda":
      callback(make_lambda(env, exp));
      return;

    case "if":
      evaluate(exp.cond, env, function CC(cond) {
        GUARD(CC, arguments);
        if (cond !== false) evaluate(exp.then, env, callback);
        else if (exp.else) evaluate(exp.else, env, callback);
        else callback(false);
      });
      return;

    case "prog":
      (function loop(last, i) {
        GUARD(loop, arguments);
        if (i < exp.prog.length)
          evaluate(exp.prog[i], env, function CC(val) {
            GUARD(CC, arguments);
            loop(val, i + 1);
          });
        else {
          callback(last);
        }
      })(false, 0);
      return;

    case "call":
      evaluate(exp.func, env, function CC(func) {
        GUARD(CC, arguments);
        (function loop(args, i) {
          GUARD(loop, arguments);
          if (i < exp.args.length)
            evaluate(exp.args[i], env, function CC(arg) {
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
      throw new Error("I don't know how to evaluate " + exp);
  }
}

function make_lambda(env: Environment, exp: LambdaAST) {
  if (exp.name) {
    env = env.extend();
    env.def(exp.name, lambda);
  }
  function lambda(callback: (result: any) => void) {
    GUARD(lambda, arguments); // <-- this
    var names = exp.vars;
    var scope = env.extend();
    for (var i = 0; i < names.length; ++i)
      scope.def(names[i], i + 1 < arguments.length ? arguments[i + 1] : false);
    evaluate(exp.body, scope, callback);
  }
  return lambda;
}

var STACKLEN = 200;
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
  set_globals(globalEnv);
  Execute(evaluate, [
    ast,
    globalEnv,
    function (result: any) {
      console.log("*** Result:", result);
    },
  ]);
}

function set_globals(globalEnv: Environment) {
  globalEnv.def("print", function (callback: Function, txt: string) {
    console.log(txt);
    callback(false);
  });

  globalEnv.def("println", function (callback: Function, txt: string) {
    console.log(txt);
    callback(false);
  });

  globalEnv.def("time", function (callback: Function, fn: Function) {
    var t1 = Date.now();

    fn(function (result: any) {
      var t2 = Date.now();
      console.log("Time: " + (t2 - t1) + "ms");
      callback(result);
    });
  });
}
