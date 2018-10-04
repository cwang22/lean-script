export class Environment {
  vars: any
  parent: Environment

  constructor(parent: Environment = null) {
    this.vars = Object.create(parent ? parent.vars : null)
    this.parent = parent
  }

  extend(): Environment {
    return new Environment(this)
  }

  lookup(name: string): Environment {
    let scope: Environment = this
    while (scope) {
      if (Object.prototype.hasOwnProperty.call(scope.vars, name)) return scope
      scope = scope.parent
    }
    return null
  }

  get(name: string): any {
    if (name in this.vars) return this.vars[name]
    throw new Error(`Undefiend variable: ${name}`)
  }

  set(name: string, value: any): Environment {
    let scope = this.lookup(name)
    if (!scope && this.parent) throw new Error(`Undefined varible ${name}`)
    return ((scope || this).vars[name] = value)
  }

  def(name: string, value: any): any {
    return (this.vars[name] = value)
  }
}