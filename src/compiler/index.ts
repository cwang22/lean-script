import { compile } from './compile'
import { toCPS } from './toCPS'
import { optimize } from './optimize'
import { ASTNode } from '../parser/parse'

export default function (AST: ASTNode): string {
  const cps = toCPS(AST, x => {
    return {
      type: 'call',
      func: {
        type: 'var',
        value: 'LS_TOPLEVEL'
      },
      args: [x]
    }
  })

  const opt = optimize(cps)

  let jsc = compile(opt)

  jsc = 'var LS_TMP;\n\n' + jsc

  if (opt.env) {
    var vars = Object.keys(opt.env.vars)
    if (vars.length > 0) {
      jsc = 'var ' + vars.map(name => {
        return compile({
          type: 'var',
          value: name
        })
      }).join(", ") + ";\n\n" + jsc
    }
  }

  jsc = '"use strict";\n\n' + jsc
  
  return jsc
}


