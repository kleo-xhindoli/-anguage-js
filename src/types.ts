export type Char = string; // alias for readability
export type Predicate = (ch: Char) => boolean;
export type ParserFn<T> = () => T;

export type OperatorChar =
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | "="
  | "&"
  | "|"
  | "<"
  | ">"
  | "!";

export type Operator =
  | "="
  | "||"
  | "&&"
  | "<"
  | ">"
  | "<="
  | ">="
  | "=="
  | "!="
  | "+"
  | "-"
  | "*"
  | "/"
  | "%";
