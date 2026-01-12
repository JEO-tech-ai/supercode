import { APIEvent } from "@solidjs/start/server";

export function POST(_event: APIEvent) {
  // Clear session cookie
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `supercoin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
    },
  });
}
