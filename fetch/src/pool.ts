export class Pool {
  #size: number;
  #count = 0;
  #queue: (() => void)[] = [];

  constructor(size: number) {
    this.#size = size;
  }

  setSize(size: number) {
    this.#size = size;
  }

  async acquire(): Promise<void> {
    if (++this.#count > this.#size) {
      await new Promise<void>(resolve => this.#queue.push(resolve));
    }
  }

  release(): void {
    this.#count--;
    const next = this.#queue.shift();
    if (next) next();
  }
}
