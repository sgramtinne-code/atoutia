import type {
  IncomingMessage,
  ServerResponse,
} from "node:http";

const MAX_JSON_BODY_BYTES =
  16 * 1024;

export class InvalidJsonBodyError
  extends Error {
  public constructor() {
    super("Invalid JSON body");
    this.name =
      "InvalidJsonBodyError";
  }
}

export class RequestBodyTooLargeError
  extends Error {
  public constructor() {
    super("Request body too large");
    this.name =
      "RequestBodyTooLargeError";
  }
}

export function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  const json =
    JSON.stringify(body);

  response.writeHead(
    statusCode,
    {
      "content-type":
        "application/json; charset=utf-8",

      "content-length":
        Buffer.byteLength(json),

      "cache-control":
        "no-store",
    },
  );

  response.end(json);
}

export function sendNotFound(
  response: ServerResponse,
): void {
  sendJson(
    response,
    404,
    {
      error: "NOT_FOUND",
    },
  );
}

export function sendMethodNotAllowed(
  response: ServerResponse,
): void {
  sendJson(
    response,
    405,
    {
      error:
        "METHOD_NOT_ALLOWED",
    },
  );
}

export async function readJsonBody(
  request: IncomingMessage,
): Promise<unknown> {
  const chunks:
    Buffer[] = [];

  let totalBytes = 0;

  for await (
    const chunk of request
  ) {
    const buffer =
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk);

    totalBytes +=
      buffer.length;

    if (
      totalBytes >
      MAX_JSON_BODY_BYTES
    ) {
      throw new RequestBodyTooLargeError();
    }

    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    throw new InvalidJsonBodyError();
  }

  const text =
    Buffer.concat(
      chunks,
    ).toString("utf8");

  try {
    return JSON.parse(text);
  } catch {
    throw new InvalidJsonBodyError();
  }
}