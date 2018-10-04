import parse from '../src/parser/index'

test('works', () => {
  const AST = {
    type: 'prog',
    prog: []
  }
  expect(AST).toEqual(parse(''))
})

test('works with number', () => {
  const AST = {
    type: 'prog',
    prog: [{
      type: 'num',
      value: 123.5
    }]
  }
  expect(AST).toEqual(
    parse('123.5')
  )
})

test('works with string', () => {
  const AST = {
    type: 'prog',
    prog: [{
      type: 'str',
      value: 'Hello World!'
    }]
  }
  expect(AST).toEqual(parse('"Hello World!"'))
})

test('works with boolean', () => {
  const AST = {
    type: 'prog',
    prog: [{
      type: 'bool',
      value: true
    }, {
      type: 'bool',
      value: false
    }]
  }
  expect(AST).toEqual(parse('true; false;'))
})

test('works with identifer', () => {
  const AST = {
    type: 'prog',
    prog: [{
      type: 'var',
      value: 'foo'
    }, {
      type: 'var',
      value: 'bar'
    }]
  }
  expect(AST).toEqual(parse('foo; bar;'))
})

test('work with function', () => {
  const AST = {
    type: 'prog',
    prog: [{
      type: 'assign',
      operator: '=',
      left: {
        type: 'var',
        value: 'foo'
      },
      right: {
        type: 'func',
        name: null,
        body: {
          type: 'binary',
          operator: '+',
          left: {
            type: 'var',
            value: 'a'
          },
          right: {
            type: 'num',
            value: 1
          }
        },
        vars: ['a']
      }
    }]
  }
  expect(AST).toEqual(parse('foo = func(a) a + 1;'))
})

test('works with function call', () => {
  const AST = {
    type: 'prog',
    prog: [{
      type: 'call',
      func: {
        type: 'var',
        value: 'foo'
      },
      args: [{
        type: 'var',
        value: 'a'
      },
      {
        type: 'num',
        value: 1
      }
      ]
    }]
  }
  expect(AST).toEqual(parse('foo(a, 1);'))
})

test('works with if', () => {
  const AST = {
    type: 'prog',
    prog: [{
      type: 'if',
      cond: {
        type: 'var',
        value: 'foo'
      },
      then: {
        type: 'var',
        value: 'bar'
      },
      else: {
        type: 'var',
        value: 'baz'
      }
    }]
  }
  expect(AST).toEqual(parse('if foo then bar else baz;'))
})

test('works with assign', () => {
  const AST = {
    type: 'prog',
    prog: [{
      type: 'assign',
      operator: '=',
      left: {
        type: 'var',
        value: 'a'
      },
      right: {
        type: 'num',
        value: 1
      }
    }]
  }
  expect(AST).toEqual(parse('a = 1;'))
})

test('works with binary', () => {
  const AST = {
    type: 'prog',
    prog: [{
      type: 'binary',
      operator: '+',
      left: {
        type: 'var',
        value: 'a'
      },
      right: {
        type: 'binary',
        operator: '*',
        left: {
          type: 'var',
          value: 'b'
        },
        right: {
          type: 'var',
          value: 'c'
        }
      }
    }]
  }
  expect(AST).toEqual(parse('a + b * c'))
})

test('works with let', () => {
  const AST = {
    type: 'prog',
    prog: [{
      type: 'let',
      vars: [{
        name: 'x',
        def: {
          type: 'num',
          value: 2
        }
      }],
      body: {
        type: 'binary',
        operator: '+',
        left: {
          type: 'var',
          value: 'x'
        },
        right: {
          type: 'num',
          value: 1
        }
      }
    }]
  }
  expect(AST).toEqual(parse('let (x = 2) x + 1'))
})