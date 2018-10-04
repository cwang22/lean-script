import { hasSideEffects } from './hasSideEffects';
import { generateSymbol } from './generateSymbol';
import { Environment } from '../Environment';
import { ASTNode } from '../parser/parse';

const FALSE = { type: 'bool', value: false }
const TRUE = { type: 'bool', value: true }

export function optimize(exp: ASTNode): ASTNode {
  let changes: number
  let defun: ASTNode
  do {
    changes = 0
    makeScope(exp)
    exp = opt(exp)
  } while (changes)
  makeScope(exp)
  return exp

  function opt(exp: ASTNode): ASTNode {
    if (changes) return exp
    switch (exp.type) {
      case 'num':
      case 'str':
      case 'bool':
      case 'var':
        return exp
      case 'binary':
        return optBinary(exp)
      case 'assign':
        return optAssign(exp)
      case 'if':
        return optIf(exp)
      case 'prog':
        return optProg(exp)
      case 'call':
        return optCall(exp)
      case 'func':
        return optFunc(exp)
    }
    throw new Error(`unable to optimize ${JSON.stringify(exp)}`)
  }

  function changed() {
    changes++
  }

  function isConstant(exp: ASTNode): boolean {
    return exp.type == 'num' || exp.type == 'str' || exp.type == 'bool'
  }

  function num(exp: ASTNode): number {
    if (exp.type != 'num')
      throw new Error('Not a number: ' + JSON.stringify(exp));
    return exp.value;
  }

  function div(exp: ASTNode): number {
    if (num(exp) == 0)
      throw new Error(`Division by zero: ${JSON.stringify(exp)}`);
    return exp.value;
  }

  function optBinary(exp: ASTNode): ASTNode {
    exp.left = opt(exp.left)
    exp.right = opt(exp.right)
    if (isConstant(exp.left) && isConstant(exp.right)) {
      switch (exp.operator) {
        case '+':
          changed()
          return {
            type: 'num',
            value: num(exp.left) + num(exp.right)
          }

        case '-':
          changed()
          return {
            type: 'num',
            value: num(exp.left) - num(exp.right)
          }

        case '*':
          changed()
          return {
            type: 'num',
            value: num(exp.left) * num(exp.right)
          }

        case '/':
          changed()
          return {
            type: 'num',
            value: num(exp.left) / div(exp.right)
          }

        case '%':
          changed()
          return {
            type: 'num',
            value: num(exp.left) % div(exp.right)
          }

        case '<':
          changed()
          return {
            type: 'bool',
            value: num(exp.left) < num(exp.right)
          }

        case '>':
          changed()
          return {
            type: 'bool',
            value: num(exp.left) > num(exp.right)
          }

        case '<=':
          changed()
          return {
            type: 'bool',
            value: num(exp.left) <= num(exp.right)
          }

        case '>=':
          changed()
          return {
            type: 'bool',
            value: num(exp.left) >= num(exp.right)
          }

        case '==':
          changed()
          if (exp.left.type !== exp.right.type)
            return FALSE
          return {
            type: 'bool',
            value: exp.left.value === exp.right.value
          }

        case '!=':
          changed()
          if (exp.left.type !== exp.right.type)
            return TRUE
          return {
            type: 'bool',
            value: exp.left.value !== exp.right.value
          }

        case '||':
          changed()
          if (exp.left.value !== false)
            return exp.left
          return exp.right

        case '&&':
          changed()
          if (exp.left.value !== false)
            return exp.right
          return FALSE
      }
    }
    return exp
  }

  function optAssign(exp: ASTNode): ASTNode {
    if (exp.left.type === 'var') {
      if (exp.right.type === 'var' && exp.right.def.cont) {
        changed()
        exp.left.def.refs.forEach(node => {
          node.value = exp.right.value
        })
        return opt(exp.right)
      }

      if (exp.left.def.refs.length === exp.left.def.assigned && exp.left.env.parent) {
        changed()
        return opt(exp.right)
      }
    }

    exp.left = opt(exp.left)
    exp.right = opt(exp.right)
    return exp
  }

  function optIf(exp: ASTNode): ASTNode {
    exp.cond = opt(exp.cond)
    exp.then = opt(exp.then)
    exp.else = opt(exp.else || FALSE)
    if (isConstant(exp.cond)) {
      changed()
      if (exp.cond.value !== false)
        return exp.then
      return exp.else
    }
    return exp
  }

  function optProg(exp: ASTNode): ASTNode {
    if (exp.prog.length === 0) {
      changed()
      return FALSE
    }
    if (exp.prog.length === 1) {
      changed()
      return opt(exp.prog[0])
    }
    if (!hasSideEffects(exp.prog[0])) {
      changed()
      return opt({
        type: 'prog',
        prog: exp.prog.slice(1)
      })
    }
    if (exp.prog.length === 2)
      return {
        type: 'prog',
        prog: exp.prog.map(opt)
      }

    return opt({
      type: 'prog',
      prog: [
        exp.prog[0],
        {
          type: 'prog',
          prog: exp.prog.slice(1)
        }
      ]
    })
  }

  function optCall(exp: ASTNode): ASTNode {
    const func: ASTNode = exp.func
    if (func.type === 'func' && !func.name) {
      if (func.env.parent.parent)
        return optIIFE(exp)
      func.unguarded = true
    }
    return {
      type: 'call',
      func: opt(func),
      args: exp.args.map(opt)
    }
  }

  function optFunc(exp: ASTNode): ASTNode {
    TCO: if (
      exp.body.type === 'call' &&
      exp.body.func.type === 'var' &&
      exp.body.func.def.assigned === 0 &&
      exp.body.func.env.parent &&
      exp.vars.indexOf(exp.body.func.value) < 0 &&
      exp.vars.length === exp.body.args.length
    ) {
      for (let i = 0; i < exp.vars.length; i++) {
        const x = exp.body.args[i]
        if (x.type !== 'var' || x.value !== exp.vars[i])
          break TCO
      }
      changed()
      return opt(exp.body.func)
    }
    exp.locs = exp.locs.filter((name: string): boolean => {
      const def = exp.env.get(name)
      return def.refs.length > 0
    })
    const save: ASTNode = defun
    defun = exp
    exp.body = opt(exp.body)
    if (exp.body.type === 'call')
      exp.unguarded = true
    defun = save
    return exp
  }

  function optIIFE(exp: ASTNode): ASTNode {
    changed()
    const func = exp.func
    const argvalues = exp.args.map(opt)
    const body = opt(func.body)
    function rename(name: string): string {
      const symbol = name in defun.env.vars ? generateSymbol(name + '$') : name;
      defun.locs.push(symbol)
      defun.env.def(symbol, true)
      func.env.get(name).refs.forEach(ref => {
        ref.value = symbol
      })
      return symbol
    }
    const prog: Array<ASTNode> = func.vars.map((name: string, i: number): ASTNode => {
      return {
        type: 'assign',
        operator: '=',
        left: {
          type: 'var',
          value: rename(name)
        },
        right: argvalues[i] || FALSE
      }
    })
    func.locs.forEach(rename)
    prog.push(body)
    return opt({
      type: 'prog',
      prog: prog
    })
  }
}

function makeScope(exp: ASTNode) {
  const global: Environment = new Environment()
  exp.env = global;
  (function scope(exp: ASTNode, env: Environment) {
    switch (exp.type) {
      case 'num':
      case 'str':
      case 'bool':
      case 'raw':
        break

      case 'var':
        var s = env.lookup(exp.value)
        if (!s) {
          exp.env = global
          global.def(exp.value, { refs: [], assigned: 0 })
        } else {
          exp.env = s
        }
        const def = exp.env.get(exp.value)
        def.refs.push(exp)
        exp.def = def
        break

      case 'assign':
        scope(exp.left, env)
        scope(exp.right, env)
        if (exp.left.type === 'var')
          exp.left.def.assigned++
        break

      case 'binary':
        scope(exp.left, env)
        scope(exp.right, env)
        break

      case 'if':
        scope(exp.cond, env)
        scope(exp.then, env)
        if (exp.else)
          scope(exp.else, env)
        break

      case 'prog':
        exp.prog.forEach((exp: ASTNode): void => {
          scope(exp, env)
        })
        break

      case 'call':
        scope(exp.func, env)
        exp.args.forEach((exp: ASTNode): void => {
          scope(exp, env)
        })
        break

      case 'func':
        exp.env = env = env.extend()

        if (exp.name)
          env.def(exp.name, { refs: [], func: true, assigned: 0 })

        exp.vars.forEach((name: string, i: number): void => {
          env.def(name, { refs: [], farg: true, assigned: 0, cont: i === 0 })
        })

        if (!exp.locs)
          exp.locs = []

        exp.locs.forEach((name: string): void => {
          env.def(name, { refs: [], floc: true, assigned: 0 })
        })

        scope(exp.body, env)
        break

      default:
        throw new Error(`Can't handle node ${JSON.stringify(exp)}`)
    }
  })(exp, global)
  return exp.env
}