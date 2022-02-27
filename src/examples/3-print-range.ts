import { exec } from "../interpreter";

const program = `
  print_range = λ(a, b) if a <= b {
    print(a);
    if a + 1 <= b {
      print(", ");
      print_range(a + 1, b);
    } else println("");
  };
  print_range(1, 10);
`;

exec(program);
