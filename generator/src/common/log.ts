export function createLogger() {
  let resolveQueue: () => void;
  let queuePromise = new Promise<void>((resolve) => (resolveQueue = resolve));
  let queue: { type: string; message: string }[] = [];

  const logStream = async function* () {
    while (true) {
      while (queue.length) yield queue.shift()!;
      await queuePromise;
    }
  };

  function log(type: string, message: string) {
    if (queue.length) {
      queue.push({ type, message });
    } else {
      queue = [{ type, message }];
      const _resolveQueue = resolveQueue;
      queuePromise = new Promise<void>((resolve) => (resolveQueue = resolve));
      _resolveQueue();
    }
  }

  if (globalThis.process?.env?.JSPM_GENERATOR_LOG) {
    (async () => {
      for await (const { type, message } of logStream()) {
        console.log(`\x1b[1m${type}:\x1b[0m ${message}`);
      }
    })();
  }

  return { log, logStream };
}

export type Log = (type: string, message: string) => void;
export type LogStream = () => AsyncGenerator<
  { type: string; message: string },
  never,
  unknown
>;
