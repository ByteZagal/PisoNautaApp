export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify({ data }), { ...init, headers });
}

export function error(status: number, message: string, details?: unknown) {
  const headers = new Headers({ "content-type": "application/json" });
  return new Response(
    JSON.stringify({ error: { code: status, message, details } }),
    { status, headers }
  );
}
