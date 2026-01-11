import { APIEvent } from "@solidjs/start/server";

export async function GET(event: APIEvent) {
  const path = event.params.path;
  return Response.json({ path, method: "GET" });
}

export async function POST(event: APIEvent) {
  const path = event.params.path;
  const body = await event.request.json();
  return Response.json({ path, method: "POST", body });
}
