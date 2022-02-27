import { exec } from "../interpreter";

const program = `
  cons = λ(x, y)
    λ(a, i, v)
      if a == "get"
        then if i == 0 then x else y
        else if i == 0 then x = v else y = v;

  car = λ(cell) cell("get", 0);
  cdr = λ(cell) cell("get", 1);
  set-car! = λ(cell, val) cell("set", 0, val);
  set-cdr! = λ(cell, val) cell("set", 1, val);

  # NIL can be a real cons this time
  NIL = cons(0, 0);
  set-car!(NIL, NIL);
  set-cdr!(NIL, NIL);

  ## test:
  x = cons(1, 2);
  println(car(x));
  println(cdr(x));
  set-car!(x, 10);
  set-cdr!(x, 20);
  println(car(x));
  println(cdr(x));
`;

exec(program);
