import { ASTNode, FALSE } from '../parser/parse'

export function compile(exp: ASTNode): string {
  return js(exp)

  function js(exp: ASTNode): string {
    switch (exp.type) {
      case 'num':
      case 'str':
      case 'bool':
        return jsAtom(exp)
      case 'var':
        return jsVar(exp)
      case 'binary':
        return jsBinary(exp)
      case 'assign':
        return jsAssign(exp)
      case "let":
        return jsLet(exp)
      case 'func':
        return jsFunction(exp)
      case 'if':
        return jsIf(exp)
      case 'prog':
        return jsProg(exp)
      case 'call':
        return jsCall(exp)
      default:
        throw new Error('unexcepted: ' + JSON.stringify(exp))
    }
  }

  function jsAtom(exp: ASTNode): string {
    return JSON.stringify(exp.value)
  }

  function jsVar(exp: ASTNode): string {
    return makeVar(exp.value)
  }

  function makeVar(name: string): string {
    return name
  }

  function jsBinary(exp: ASTNode): string {
    return `(${js(exp.left)}${exp.operator}${js(exp.right)})`
  }

  function jsAssign(exp: ASTNode): string {
    return jsBinary(exp)
  }

  function jsFunction(exp: ASTNode): string {
    let code: string = '(function '
    let CC: string
    if (!exp.unguarded) {
      CC = exp.name || 'LS_CC'
      code += makeVar(CC)
    }

    code += `(${exp.vars.map(makeVar).join(', ')}) {`

    if (exp.locs && exp.locs.length > 0) {
      code += `var ${exp.locs.join(', ')};`
    }

    if (!exp.unguarded) {
      code += `GUARD(arguments, ${CC}); `
    }

    code += ` ${js(exp.body)} })`
    return code
  }

  function jsLet(exp: ASTNode): string {
    if (exp.vars.length === 0)
      return js(exp.body)

    const iife: ASTNode = {
      type: 'call',
      func: {
        type: 'func',
        vars: [exp.vars[0].name],
        body: {
          type: 'let',
          vars: exp.vars.slice(1),
          body: exp.body
        }
      },
      args: [exp.vars[0].def || FALSE]
    }

    return `(${js(iife)})`
  }

  function jsIf(exp: ASTNode): string {
    return `(${js(exp.cond)} !== false ? ${js(exp.then)} : ${js(exp.else || FALSE)})`
  }

  function jsProg(exp: ASTNode): string {
    return `(${exp.prog.map(js).join(', ')})`
  }

  function jsCall(exp: ASTNode): string {
    return `${js(exp.func)}(${exp.args.map(js).join(', ')})`
  }
}