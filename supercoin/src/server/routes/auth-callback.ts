import { Hono } from "hono";
import { html } from "hono/html";
import { EventEmitter } from "events";
import type { OAuthCallbackData } from "../../services/auth/types";

export const callbackEmitter = new EventEmitter();

export function createAuthCallbackRoutes(): Hono {
  const app = new Hono();

  app.get("/:provider", async (c) => {
    const provider = c.req.param("provider");
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");
    const errorDescription = c.req.query("error_description");

    if (error) {
      const callbackData: OAuthCallbackData = {
        code: "",
        state: state || "",
        error,
        errorDescription,
      };

      callbackEmitter.emit(`callback:${provider}`, {
        success: false,
        provider,
        ...callbackData,
      });

      return c.html(html`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authentication Failed</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: #fff;
              }
              .container {
                text-align: center;
                padding: 40px;
                background: rgba(255,255,255,0.1);
                border-radius: 12px;
                backdrop-filter: blur(10px);
              }
              h1 { color: #ff6b6b; margin-bottom: 16px; }
              p { color: #ddd; margin: 8px 0; }
              .error { color: #ff6b6b; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Authentication Failed</h1>
              <p>Provider: <strong>${provider}</strong></p>
              <p class="error">${errorDescription || error}</p>
              <p>You can close this window.</p>
            </div>
            <script>setTimeout(() => window.close(), 5000);</script>
          </body>
        </html>
      `);
    }

    if (!code) {
      return c.html(html`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authentication Error</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: #fff;
              }
              .container {
                text-align: center;
                padding: 40px;
                background: rgba(255,255,255,0.1);
                border-radius: 12px;
              }
              h1 { color: #ff6b6b; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Missing Authorization Code</h1>
              <p>The authorization code was not received.</p>
            </div>
          </body>
        </html>
      `);
    }

    if (!state) {
      return c.html(html`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Security Error</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: #fff;
              }
              .container {
                text-align: center;
                padding: 40px;
                background: rgba(255,255,255,0.1);
                border-radius: 12px;
              }
              h1 { color: #ff6b6b; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🛡️ Security Error</h1>
              <p>Missing state parameter (CSRF protection).</p>
            </div>
          </body>
        </html>
      `);
    }

    const callbackData: OAuthCallbackData = {
      code,
      state,
    };

    callbackEmitter.emit(`callback:${provider}`, {
      success: true,
      provider,
      ...callbackData,
    });

    return c.html(html`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
              color: #fff;
            }
            .container {
              text-align: center;
              padding: 40px;
              background: rgba(255,255,255,0.1);
              border-radius: 12px;
              backdrop-filter: blur(10px);
            }
            h1 { color: #4ade80; margin-bottom: 16px; }
            p { color: #ddd; }
            .spinner {
              width: 40px;
              height: 40px;
              border: 4px solid rgba(255,255,255,0.3);
              border-top: 4px solid #4ade80;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ Authentication Successful!</h1>
            <p>Provider: <strong>${provider}</strong></p>
            <div class="spinner"></div>
            <p>Processing... You can close this window.</p>
          </div>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `);
  });

  return app;
}

export function waitForCallback(
  provider: string,
  timeoutMs: number = 120000
): Promise<OAuthCallbackData> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      callbackEmitter.removeAllListeners(`callback:${provider}`);
      reject(new Error(`OAuth callback timeout for ${provider}`));
    }, timeoutMs);

    callbackEmitter.once(`callback:${provider}`, (result) => {
      clearTimeout(timer);
      if (result.success) {
        resolve({ code: result.code, state: result.state });
      } else {
        reject(new Error(result.errorDescription || result.error || "OAuth failed"));
      }
    });
  });
}
