let counter: number = 0

export function generateSymbol(name: string = ''): string {
  return `LS_${name}${counter++}`
}