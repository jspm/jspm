export class JspmError extends Error {
  jspmError = true;
  code: string | undefined;
  constructor(msg: string, code?: string) {
    super(msg);
    this.code = code;
  }
}

export function throwInternalError(...args): never {
  throw new Error(
    "Internal Error" + (args.length ? " " + args.join(", ") : "")
  );
}
