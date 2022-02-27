import { exec } from "../interpreter";

const program = `
  println(let loop (n = 100)
    if n > 0 then n + loop(n - 1)
            else 0);

  let (x = 2, y = x + 1, z = x + y) println(x + y + z);

  # errors out, the vars are bound to the let body
  # print(x + y + z);

  let (x = 10) {
    let (x = x * 2, y = x * x) {
      println(x);  ## 20
      println(y);  ## 400
    };
    println(x);  ## 10
  };

`;

exec(program);
