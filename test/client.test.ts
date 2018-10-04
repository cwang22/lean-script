import littleScript from '../src/index'

test('it works', () => {
  expect(144).toEqual(littleScript('fib = func(n) if n < 2 then n else fib(n - 1) + fib(n - 2);fib(12);'))
})