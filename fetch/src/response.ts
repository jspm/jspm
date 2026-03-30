export interface CachedResponse {
  url: string;
  status: number;
  statusText: string;
  ok: boolean;
  headers: Headers;
  text(): string;
  json(): any;
  arrayBuffer(): ArrayBuffer;
}

export class CachedResponseImpl implements CachedResponse {
  readonly url: string;
  readonly status: number;
  readonly statusText: string;
  readonly ok: boolean;
  readonly headers: Headers;
  #body: Buffer;
  #text: string | null = null;

  constructor(
    url: string,
    status: number,
    statusText: string,
    headers: Headers,
    body: Buffer
  ) {
    this.url = url;
    this.status = status;
    this.statusText = statusText;
    this.ok = status >= 200 && status < 300;
    this.headers = headers;
    this.#body = body;
  }

  text(): string {
    return (this.#text ??= this.#body.toString());
  }

  json(): any {
    return JSON.parse(this.text());
  }

  arrayBuffer(): ArrayBuffer {
    return this.#body.buffer.slice(
      this.#body.byteOffset,
      this.#body.byteOffset + this.#body.byteLength
    );
  }
}
