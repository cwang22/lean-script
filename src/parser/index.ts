import { InputStream } from './InputStream'
import { TokenStream } from './TokenStream'
import { parse, ASTNode } from './parse'

export default function (code: string): ASTNode {
  return parse(TokenStream(InputStream(code)))
}