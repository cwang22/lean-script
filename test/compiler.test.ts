import compile from '../src/compiler/index'
import parse from '../src/parser/index'

test('it works', () => {
  compile(parse('fib = func(n) if n < 2 then n else fib(n - 1) + fib(n - 2)'))
})