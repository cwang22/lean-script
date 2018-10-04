import { IInputStream } from './InputStream'

export interface ITokenStream {
  next: { (): TokenNode }
  peek: { (): TokenNode }
  eof: { (): boolean }
  croak: { (string): never }
}

export interface TokenNode {
  type: string
  value: any
}

interface Predicate {
  (ch: string): boolean
}

export function TokenStream(input: IInputStream) {
  let current: TokenNode = null
  const keywords: string = ' let if then else func true false '

  return {
    next,
    peek,
    eof,
    croak: input.croak
  }

  function isKeyword(ch: string): boolean {
    return keywords.indexOf(` ${ch} `) >= 0
  }

  function isDigit(ch: string): boolean {
    return /[0-9]/i.test(ch)
  }

  function isIdentifierStart(ch: string): boolean {
    return /[a-z_]/i.test(ch)
  }

  function isIdentifier(ch: string): boolean {
    return isIdentifierStart(ch) || '?!-<>=0123456789'.indexOf(ch) >= 0
  }

  function isOperator(ch: string): boolean {
    return '+-*/%=&|<>!'.indexOf(ch) >= 0
  }

  function isPunctuation(ch: string): boolean {
    return ',;(){}[]'.indexOf(ch) >= 0
  }

  function isWhitespace(ch: string): boolean {
    return ' \t\n'.indexOf(ch) >= 0
  }

  function readWhile(predicate: Predicate): string {
    let str: string = ''
    while (!input.eof() && predicate(input.peek())) {
      str += input.next()
    }
    return str
  }

  function readNumber(): TokenNode {
    let hasDot: boolean = false
    let number: string = readWhile(ch => {
      if (ch === '.') {
        if (hasDot) return false
        hasDot = true
        return true
      }
      return isDigit(ch)
    })

    return { type: 'num', value: parseFloat(number) }
  }

  function readIdentifier(): TokenNode {
    let value: string = readWhile(isIdentifier)

    return {
      type: isKeyword(value) ? 'kw' : 'var',
      value
    }
  }

  function readEscaped(end: string): string {
    let escaped: boolean = false
    let str: string = ''

    input.next()

    while (!input.eof()) {
      let ch: string = input.next()
      if (escaped) {
        str += ch
        escaped = false
      }
      else if (ch === '\\') escaped = true
      else if (ch === end) break
      else str += ch
    }

    return str
  }

  function readString(): TokenNode {
    return {
      type: 'str',
      value: readEscaped('"')
    }
  }

  function skipComment(): void {
    readWhile(ch => ch !== '\n')
    input.next()
  }

  function readNext(): TokenNode {
    readWhile(isWhitespace)
    if (input.eof()) return null

    let ch: string = input.peek()
    if (ch === '#') {
      skipComment()
      return readNext()
    }

    if (ch === '"') return readString()
    if (isDigit(ch)) return readNumber()
    if (isIdentifierStart(ch)) return readIdentifier()
    if (isPunctuation(ch))
      return {
        type: 'punc',
        value: input.next()
      }

    if (isOperator(ch))
      return {
        type: 'op',
        value: readWhile(isOperator)
      }

    input.croak(`Cannot handle character: ${ch}`)
  }

  function peek(): TokenNode {
    return current || (current = readNext())
  }

  function next(): TokenNode {
    let tok: TokenNode = current
    current = null
    return tok || readNext()
  }

  function eof(): boolean {
    return peek() === null
  }
}