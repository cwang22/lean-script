import { ASTNode, FALSE } from "../parser/parse"
import { generateSymbol } from '../util/generateSymbol'
import { hasSideEffects } from '../util/hasSideEffects'

export interface CC {
  (any): ASTNode
}

export function toCPS(exp: ASTNode, k: CC): ASTNode {
  return cps(exp, k)

  function cps(exp: ASTNode, k: CC): ASTNode {
    switch (exp.type) {
      case 'num':
      case 'str':
      case 'bool':
      case 'var':
        return cpsAtom(exp, k)
      case 'assign':
      case 'binary':
        return cpsBinary(exp, k)
      case 'let':
        return cpsLet(exp, k)
      case 'func':
        return cpsFunction(exp, k)
      case 'if':
        return cpsIf(exp, k)
      case 'prog':
        return cpsProg(exp, k)
      case 'call':
        return cpsCall(exp, k)
      default:
        throw new Error(`Unknown type: ${JSON.stringify(exp)}`)
    }
  }

  function cpsAtom(exp: ASTNode, k: CC): ASTNode {
    return k(exp)
  }

  function cpsBinary(exp: ASTNode, k: CC): ASTNode {
    return cps(exp.left, left => {
      return cps(exp.right, right => {
        return k({
          type: exp.type,
          operator: exp.operator,
          left,
          right
        })
      })
    })
  }

  function cpsLet(exp: ASTNode, k: CC): ASTNode {
    if (exp.vars.length === 0)
      return cps(exp.body, k)
    return cps({
      type: 'call',
      args: [exp.vars[0].def || FALSE],
      func: {
        type: 'func',
        vars: [exp.vars[0].name],
        body: {
          type: 'let',
          vars: exp.vars.slice(1),
          body: exp.body
        }
      }
    }, k)
  }

  function cpsFunction(exp: ASTNode, k: CC): ASTNode {
    const cont: string = generateSymbol('K')
    const body: ASTNode = cps(exp.body, body => {
      return {
        type: 'call',
        func: {
          type: 'var',
          value: cont
        },
        args: [body]
      }
    })

    return k({
      type: 'func',
      name: exp.name,
      vars: [cont].concat(exp.vars),
      body
    })
  }

  function cpsIf(exp: ASTNode, k: CC): ASTNode {
    return cps(exp.cond, cond => {
      const cvar: string = generateSymbol('I')
      const cast: ASTNode = makeContinuation(k)

      k = ifresult => {
        return {
          type: 'call',
          func: {
            type: 'var',
            value: cvar
          },
          args: [ifresult]
        }
      }

      return {
        type: 'call',
        func: {
          type: 'func',
          vars: [cvar],
          body: {
            type: 'if',
            cond,
            then: cps(exp.then, k),
            else: cps(exp.else || FALSE, k)
          }
        },
        args: [cast]
      }
    })
  }

  function cpsCall(exp: ASTNode, k: CC): ASTNode {
    return cps(exp.func, func => {
      return (function loop(args: Array<ASTNode>, i: number) {
        if (i === exp.args.length)
          return {
            type: 'call',
            func,
            args
          }
        return cps(exp.args[i], value => {
          args[i + 1] = value
          return loop(args, i + 1)
        })
      })([makeContinuation(k)], 0)
    })
  }

  function makeContinuation(k: CC): ASTNode {
    const cont: string = generateSymbol('R')
    return {
      type: 'func',
      vars: [cont],
      body: k({
        type: 'var',
        value: cont
      })
    }
  }

  function cpsProg(exp: ASTNode, k: CC): ASTNode {
    return (function loop(body: Array<ASTNode>): ASTNode {
      if (body.length === 0) return k(FALSE)
      if (body.length === 1) return cps(body[0], k)
      if (!hasSideEffects(body[0])) return loop(body.slice(1))
      return cps(body[0], first => {
        if (hasSideEffects(first))
          return {
            type: 'prog',
            prog: [first, loop(body.slice(1))]
          }
        return loop(body.slice(1))
      })
    })(exp.prog)
  }
}