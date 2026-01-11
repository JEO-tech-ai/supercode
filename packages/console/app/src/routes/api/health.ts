import { APIEvent } from "@solidjs/start/server";

export function GET(_event: APIEvent) {
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
  });
}
