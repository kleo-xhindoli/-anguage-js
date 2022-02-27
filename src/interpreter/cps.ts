import { AST, LambdaAST } from "../ast";
import Environment from "./shared/environment";
import { apply_op } from "./shared/utils";

export default function evaluate(
  exp: AST,
  env: Environment,
  callback: (exp_result: any) => void
) {
  if (!callback) return;
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
      const leftAst = exp.left;
      const rightAst = exp.right;

      if (leftAst.type !== "var")
        throw new Error("Cannot assign to " + JSON.stringify(exp.left));

      evaluate(rightAst, env, function (right) {
        callback(env.set(leftAst.value, right));
      });
      return;

    case "binary":
      evaluate(exp.left, env, function (left) {
        evaluate(exp.right, env, function (right) {
          callback(apply_op(exp.operator, left, right));
        });
      });
      return;

    case "let":
      (function loop(env, i) {
        if (i < exp.vars.length) {
          var v = exp.vars[i];
          if (v.def)
            evaluate(v.def, env, function (value) {
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
      evaluate(exp.cond, env, function (cond) {
        if (cond !== false) evaluate(exp.then, env, callback);
        else if (exp.else) evaluate(exp.else, env, callback);
        else callback(false);
      });
      return;

    case "prog":
      (function loop(last, i) {
        if (i < exp.prog.length)
          evaluate(exp.prog[i], env, function (val) {
            loop(val, i + 1);
          });
        else {
          callback(last);
        }
      })(false, 0);
      return;

    case "call":
      evaluate(exp.func, env, function (func) {
        (function loop(args, i) {
          if (i < exp.args.length)
            evaluate(exp.args[i], env, function (arg) {
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
    var names = exp.vars;
    var scope = env.extend();
    for (var i = 0; i < names.length; ++i)
      scope.def(names[i], i + 1 < arguments.length ? arguments[i + 1] : false);

    evaluate(exp.body, scope, callback);
  }
  return lambda;
}

export function set_globals(globalEnv: Environment) {
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
    var ret = fn();
    var t2 = Date.now();
    console.log("Time: " + (t2 - t1) + "ms");
    callback(ret);
  });
}
