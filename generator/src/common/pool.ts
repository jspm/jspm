export class Pool {
  #POOL_SIZE = 10;
  #opCnt = 0;
  #cbs: (() => void)[] = [];
  constructor(POOL_SIZE: number) {
    this.#POOL_SIZE = POOL_SIZE;
  }
  async queue() {
    if (++this.#opCnt > this.#POOL_SIZE)
      await new Promise((resolve) => this.#cbs.push(resolve as () => {}));
  }
  pop() {
    this.#opCnt--;
    const cb = this.#cbs.pop();
    if (cb) cb();
  }
}
