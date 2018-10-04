export interface IInputStream {
  next: { (): string }
  peek: { (): string }
  eof: { (): boolean }
  croak: { (string): never }
}

export function InputStream(input: string): IInputStream {
  let pos: number = 0
  let line: number = 1
  let col: number = 0

  return {
    next,
    peek,
    eof,
    croak
  }

  function next(): string {
    const ch: string = input.charAt(pos++)
    if (ch === '\n') {
      line++
      col = 0
    } else {
      col++
    }
    return ch
  }

  function peek(): string {
    return input.charAt(pos)
  }

  function eof(): boolean {
    return peek() === ''
  }

  function croak(message: string): never {
    throw new Error(`${message} (${line}:${col})`)
  }
}