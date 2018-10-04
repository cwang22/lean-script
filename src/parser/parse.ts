import { ITokenStream, TokenNode } from './TokenStream'

export interface ASTNode {
  type: string
  [x: string]: any
}

interface VarNode {
  name: string,
  def: ASTNode
}

export const FALSE: ASTNode = {
  type: 'bool',
  value: false
}

const PRECEDENCE = {
  '=': 1,
  '||': 2,
  '&&': 3,
  '<': 7,
  '>': 7,
  '<=': 7,
  '>=': 7,
  '==': 7,
  '!=': 7,
  '+': 10,
  '-': 10,
  '*': 20,
  '/': 20,
  '%': 20
}

export function parse(input: ITokenStream): ASTNode {
  return parseTopLevel()

  function parseTopLevel(): ASTNode {
    let prog = []
    while (!input.eof()) {
      prog.push(parseExpression())
      if (!input.eof()) skipPunctuation(';')
    }

    return {
      type: 'prog',
      prog
    }
  }

  function delimited<T>(start: string, stop: string, separator: string, parser: { (): T }): Array<T> {
    let a: Array<T> = []
    let first: boolean = true

    skipPunctuation(start)

    while (!input.eof()) {
      if (isPunctuation(stop)) break

      if (first) first = false
      else skipPunctuation(separator)

      if (isPunctuation(stop)) break

      a.push(parser())
    }

    skipPunctuation(stop)

    return a
  }

  function parseFunction(): ASTNode {
    return {
      type: 'func',
      name: input.peek().type === 'var' ? input.next().value : null,
      vars: delimited('(', ')', ',', parseVarName),
      body: parseExpression()
    }
  }

  function parseLet(): ASTNode {
    skipKeyword('let')
    if (input.peek().type === 'var') {
      const name: string = input.next().value
      const defs: Array<VarNode> = delimited('(', ')', ',', parseVarDef)

      return {
        type: 'call',
        func: {
          type: 'func',
          name,
          vars: defs.map(def => def.name),
          body: parseExpression()
        },
        args: defs.map(def => def.def || FALSE)
      }
    }

    return {
      type: 'let',
      vars: delimited('(', ')', ',', parseVarDef),
      body: parseExpression()
    }
  }

  function parseVarDef(): VarNode {
    const name: string = parseVarName()
    let def: ASTNode
    if (isOperator('=')) {
      input.next()
      def = parseExpression()
    }

    return {
      name,
      def
    }
  }

  function parseVarName(): string {
    const name: TokenNode = input.next()
    if (name.type !== 'var') input.croak('Expecting variable name')
    return name.value
  }

  function parseIf(): ASTNode {
    skipKeyword('if')
    const cond: ASTNode = parseExpression()
    if (!isPunctuation('{')) {
      skipKeyword('then')
    }

    const then: ASTNode = parseExpression()

    const result: ASTNode = {
      type: 'if',
      cond,
      then
    }

    if (isKeyword('else')) {
      input.next()
      result['else'] = parseExpression()
    }

    return result
  }

  function parseBool(): ASTNode {
    return {
      type: 'bool',
      value: input.next().value === 'true'
    }
  }

  function parseAtom(): ASTNode {
    return lexCall(() => {
      if (isPunctuation('(')) {
        input.next()
        const exp: ASTNode = parseExpression()
        skipPunctuation(')')
        return exp
      }

      if (isPunctuation('{')) return parseProg()
      if (isKeyword('if')) return parseIf()
      if (isKeyword('true') || isKeyword('false')) return parseBool()
      if (isKeyword('func')) {
        input.next()
        return parseFunction()
      }

      if (isKeyword('let')) return parseLet()

      const tok: TokenNode = input.next()
      if (tok.type === 'var' || tok.type === 'num' || tok.type === 'str') return tok
      unexpected()
    })
  }

  function parseProg(): ASTNode {
    const prog: Array<ASTNode> = delimited('{', '}', ';', parseExpression)
    if (prog.length === 0) return FALSE
    if (prog.length === 1) return prog[0]
    return {
      type: 'prog',
      prog
    }
  }

  function parseExpression(): ASTNode {
    return lexCall(() => {
      return lexBinary(parseAtom(), 0)
    })
  }

  function lexCall(expr: { (): ASTNode }): ASTNode {
    let result: ASTNode = expr()
    return isPunctuation('(') ? parseCall(result) : result
  }

  function parseCall(func: ASTNode): ASTNode {
    return {
      type: 'call',
      func,
      args: delimited('(', ')', ',', parseExpression)
    }
  }

  function lexBinary(left: ASTNode, prec: number): ASTNode {
    if (isOperator()) {
      const tok: ASTNode = input.peek()
      const otherPrec: number = PRECEDENCE[tok.value]
      if (otherPrec > prec) {
        input.next()
        const right: ASTNode = lexBinary(parseAtom(), otherPrec)
        const binary: ASTNode = {
          type: tok.value === '=' ? 'assign' : 'binary',
          operator: tok.value,
          left,
          right
        }

        return lexBinary(binary, prec)
      }
    }
    return left

  }

  function isPunctuation(ch: string): boolean {
    const tok: ASTNode = input.peek()
    return tok !== null && tok.type === 'punc' && (!ch || tok.value === ch)
  }

  function isKeyword(ch: string): boolean {
    const tok: ASTNode = input.peek()
    return tok !== null && tok.type === 'kw' && (!ch || tok.value === ch)
  }

  function isOperator(ch?: string): boolean {
    const tok: ASTNode = input.peek()
    return tok !== null && tok.type === 'op' && (!ch || tok.value === ch)
  }

  function skipPunctuation(ch: string): void {
    if (isPunctuation(ch)) input.next()
    else input.croak(`Expecting punctuation: "${ch}"`)
  }

  function skipKeyword(ch: string): void {
    if (isKeyword(ch)) input.next()
    else input.croak(`Expecting Keyword: "${ch}"`)
  }

  function unexpected(): void {
    const tok: string = JSON.stringify(input.peek())
    input.croak(`Unexpected token: ${tok}`)
  }
}
