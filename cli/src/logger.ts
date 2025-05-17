import { createWriteStream } from "node:fs";
import os from "os";
import c from "picocolors";

export type Log = (type: string, message: string) => void;
export type LogStream = () => AsyncGenerator<
  { type: string; message: string },
  never,
  unknown
>;

// Switch for checking if debug logging is on:
export const logEnabled = !!process.env.JSPM_CLI_LOG;
export const logToStdout = process.env.JSPM_CLI_LOG === "1";

// Actual debug logger implementation:
let _log: Log, _logStream: LogStream;
if (logEnabled) {
  ({ log: _log, logStream: _logStream } = createLogger());

  try {
    let logPath;
    let logFileStream = null;

    if (logToStdout) {
      // If JSPM_CLI_LOG=1, log to stdout
      console.log(c.red(`Debug logging enabled - outputting to stdout`));
    } else {
      // Otherwise, log to file
      if (
        process.env.JSPM_CLI_LOG === "true" ||
        process.env.JSPM_CLI_LOG?.toLowerCase() === "true"
      ) {
        logPath = `${os.tmpdir()}/jspm-${new Date()
          .toISOString()
          .slice(0, 19)}.log`;
      } else {
        logPath = process.env.JSPM_CLI_LOG;
      }

      // Use a write stream instead of fs.writeFile for better performance and auto-flushing
      logFileStream = createWriteStream(logPath, {
        flags: "a",
        encoding: "utf8",
        mode: 0o666,
      });

      console.log(c.red(`Debug logging enabled - writing to ${logPath}`));
    }

    (async () => {
      if (logFileStream) {
        // Write header to the log file
        logFileStream.write(
          `JSPM CLI Log started at ${new Date().toISOString()}\n\n`
        );
      }

      for await (const { type, message } of _logStream()) {
        const time = new Date().toISOString().slice(11, 23);
        const formattedMessage = `${time} ${type}: ${message}\n`;

        if (logToStdout) {
          // Log to stdout
          const prefix = c.bold(`${time} ${type}:`);
          console.log(`${prefix} ${message}`);
        } else if (logFileStream) {
          // Log to file
          logFileStream.write(formattedMessage);
        }
      }
    })();
  } catch (e) {
    console.error(c.red(`Failed to create debug logger: ${e.message}`));
  }
}

export function log(type: string, message: string) {
  _log && _log(type, message);
}

export function withType(type: string) {
  return (message: string) => log(type, message);
}

// Actual logger implementation, ripped from the generator:
function createLogger() {
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

  return { log, logStream };
}
