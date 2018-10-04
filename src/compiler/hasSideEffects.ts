import { ASTNode } from "../parser/parse"

export function hasSideEffects(exp: ASTNode): boolean {
  switch (exp.type) {
    case 'call':
    case 'assign':
      return true

    case 'num':
    case 'str':
    case 'bool':
    case 'var':
    case 'func':
      return false

    case 'binary':
      return hasSideEffects(exp.left) || hasSideEffects(exp.right)

    case 'if':
      return hasSideEffects(exp.cond) || hasSideEffects(exp.then) || (exp.else && hasSideEffects(exp.else))

    case 'let': {
      for (let i = 0; i < exp.vars.length; i++) {
        const v = exp.vars[i];
        if (v.def && hasSideEffects(v.def)) return true
      }
      return hasSideEffects(exp.body)
    }
    case 'prog': {
      for (let i = 0; i < exp.prog.length; i++) {
        if (hasSideEffects(exp.prog[i])) return true
      }
      return false
    }
  }
  return true
}