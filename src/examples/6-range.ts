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

  range = λ(a, b)
    if a <= b then cons(a, range(a + 1, b))
              else NIL;
  
  # print the squares of 1..8
  foreach(range(1, 8), λ(x) println(x * x));
`;

exec(program);
