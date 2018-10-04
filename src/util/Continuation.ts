export default class Continuation {
  f: Function
  args: Array<any>
  constructor(f: Function, args: Array<any>) {
    this.f = f
    this.args = args
  }
}