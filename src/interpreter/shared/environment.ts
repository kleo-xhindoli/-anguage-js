export default class Environment {
  vars: Record<string, any> = {};
  parent: Environment | null = null;

  constructor(parent?: Environment) {
    this.vars = Object.create(parent ? parent.vars : null);
    parent && (this.parent = parent);
  }

  extend() {
    return new Environment(this);
  }

  lookup(name: string) {
    let scope: Environment | null = this;

    while (scope) {
      if (Object.hasOwnProperty.call(scope.vars, name)) return scope;
      scope = scope.parent;
    }
  }

  get(name: string) {
    if (name in this.vars) return this.vars[name];
    throw new Error("Undefined variable " + name);
  }

  set(name: string, value: any) {
    const scope = this.lookup(name);
    // let's not allow defining globals from a nested environment
    if (!scope && this.parent) throw new Error("Undefined variable " + name);
    return ((scope || this).vars[name] = value);
  }

  def(name: string, value: any) {
    return (this.vars[name] = value);
  }
}
