
export async function refreshClaudeToken(
  refreshToken: string,
  clientId: string
): Promise<{
  access_token: string;
  refresh_token: string; // Rotated?
  expires_in: number;
}> {
  // Based on prompt description for Claude Pro/Max OAuth
  const response = await fetch("https://console.anthropic.com/api/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId || "claude-code-cli-client-id", // Default from guide
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude Token Refresh Error: ${response.status}`);
  }

  return response.json();
}
