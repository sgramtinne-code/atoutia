import type {
  ServerResponse,
} from "node:http";

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