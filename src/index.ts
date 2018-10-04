import parse from './parser/index'
import compile from './compiler/index'

let stackLength: number
let inExecute: boolean = false

function GUARD(args: Array<any>, f: Function) {
  if (--stackLength < 0) throw new Continuation(f, args)
}

function Continuation(f: Function, args: Array<any>) {
  this.f = f
  this.args = args
}

function Execute(f: Function, args: Array<any>) {
  if (inExecute)
    return f.apply(null, args)
  inExecute = true
  while (true) {
    try {
      stackLength = 200
      f.apply(null, args)
      break
    } catch (ex) {
      if (ex instanceof Continuation) {
        f = ex.f
        args = ex.args
      } else {
        inExecute = false
        throw ex
      }
    }
  }

  inExecute = false
}

export default function (code: string): string {
  let res: string
  const AST = parse(code)
  const jsc = compile(AST)
  const func = new Function('LS_TOPLEVEL, GUARD, Execute', jsc)
  Execute(func, [
    result => {
      res = result
    },
    GUARD,
    Execute
  ])

  return res
}

