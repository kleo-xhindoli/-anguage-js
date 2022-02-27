import { exec } from "../interpreter";

const program = `
  cons = λ(a, b) λ(f) f(a, b);
  car = λ(cell) cell(λ(a, b) a);
  cdr = λ(cell) cell(λ(a, b) b);
  NIL = λ(f) f(NIL, NIL);

  foreach = λ(list, f)
            if list != NIL {
              f(car(list));
              foreach(cdr(list), f);
            };

  x = cons(1, cons(2, cons(3, cons(4, cons(5, NIL)))));
  foreach(x, println);
`;

exec(program);
