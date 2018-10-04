# Lean Script

a basic programming language implemented in TypeScript.

## Syntax

    # this is a comment
    
    # assign
    a = 1;
    b = 2 + 3 * 4;
    
    # string
    c = "Hello World!"
    
    # block scoped variable
    let (a = 10, b = 20) {
      a + b;
    }
    
    # function
    fib = func(n) if n < 2 then n else fib(n - 1) + fib(n - 2);
    
## Usage
The language is packed as an UMD style library under namepsace `LS`

````html
    <script src="path/to/lean-script.js"></script>
    <script>
        // 13
        console.log(LS('fib = func(n) if n < 2 then n else fib(n - 1) + fib(n - 2); fib(7);'))
    </script>
````
