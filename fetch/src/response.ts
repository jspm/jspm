export interface CachedResponse {
  url: string;
  status: number;
  statusText: string;
  ok: boolean;
  headers: Headers;
  text(): Promise<string>;
  json(): Promise<any>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

const textDecoder = new TextDecoder();

export class CachedResponseImpl implements CachedResponse {
  readonly url: string;
  readonly status: number;
  readonly statusText: string;
  readonly ok: boolean;
  readonly headers: Headers;
  #body: Uint8Array;
  #text: string | null = null;

  constructor(
    url: string,
    status: number,
    statusText: string,
    headers: Headers,
    body: Uint8Array
  ) {
    this.url = url;
    this.status = status;
    this.statusText = statusText;
    this.ok = status >= 200 && status < 300;
    this.headers = headers;
    this.#body = body;
  }

  async text(): Promise<string> {
    return (this.#text ??= textDecoder.decode(this.#body));
  }

  async json(): Promise<any> {
    return JSON.parse(this.#text ??= textDecoder.decode(this.#body));
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.#body.buffer.slice(
      this.#body.byteOffset,
      this.#body.byteOffset + this.#body.byteLength
    );
  }

  // Internal: sync body access for the local cache layer.
  get bodyBuffer(): Uint8Array {
    return this.#body;
  }
}
