export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Fetch static asset or API route response
    let response;
    if (url.pathname === "/functions/submit-contact" && request.method === "POST") {
      response = await handleContactSubmit(request, env);
    } else if (url.pathname === "/api/ghost" && request.method === "GET") {
      response = await handleGhostGet(request, env);
    } else if (url.pathname === "/api/ghost" && request.method === "POST") {
      response = await handleGhostPost(request, env);
    } else if (env.ASSETS) {
      response = await env.ASSETS.fetch(request);
    } else {
      response = new Response("Not Found", { status: 404 });
    }

    // Clone response to attach security headers
    const secureHeaders = new Headers(response.headers);

    // Top-Notch Edge Security Headers
    secureHeaders.set("X-Frame-Options", "DENY"); // Prevents Clickjacking
    secureHeaders.set("X-Content-Type-Options", "nosniff"); // Prevents MIME type sniffing
    secureHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin"); // Standard privacy-friendly referrer
    secureHeaders.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload"); // Forces SSL
    secureHeaders.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()"); // Disables unneeded hardware access

    // Content Security Policy (Optimized for Tailwind CDN, Google Fonts, and data-URI favicon)
    secureHeaders.set("Content-Security-Policy", 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none'; " +
      "upgrade-insecure-requests;"
    );

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: secureHeaders
    });
  }
};

async function handleContactSubmit(request, env) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // Server-side validation
    if (!name || name.trim().length === 0 || !email || !message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid payload." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid email." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Server-Side Duplicate Submission Check (Cloudflare KV)
    const kv = env?.PORTFOLIO_KV || globalThis?.PORTFOLIO_KV;
    const emailKey = `submit:${email.toLowerCase().trim()}`;
    if (kv) {
      const hasSubmitted = await kv.get(emailKey);
      if (hasSubmitted) {
        return new Response(
          JSON.stringify({ success: false, message: "Duplicate submission blocked." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Resolve environment variables securely at runtime
    const resendApiKey = env?.RESEND_API_KEY || globalThis?.RESEND_API_KEY || (typeof process !== "undefined" && process.env?.RESEND_API_KEY);
    const receiverEmail = env?.CONTACT_RECEIVER_EMAIL || globalThis?.CONTACT_RECEIVER_EMAIL || (typeof process !== "undefined" && process.env?.CONTACT_RECEIVER_EMAIL) || "abhishekaryan23@gmail.com";
    const senderFrom = env?.CONTACT_FROM_EMAIL || globalThis?.CONTACT_FROM_EMAIL || (typeof process !== "undefined" && process.env?.CONTACT_FROM_EMAIL) || "contact@abhishekrai.dev";

    if (!resendApiKey) {
      console.error("Resend API key configuration missing on Cloudflare.");
      return new Response(
        JSON.stringify({ success: false, message: "Server configuration issue." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Send Notification Email to Abhishek Rai (receiverEmail)
    const notificationEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Portfolio Message</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif;
            background-color: #fcf9f2;
            color: #1d1b18;
            margin: 0;
            padding: 40px 20px;
          }
          .container {
            max-width: 560px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #d84315;
            padding: 40px;
          }
          .header {
            font-size: 20px;
            color: #d84315;
            border-bottom: 1px solid #ffefe8;
            padding-bottom: 15px;
            margin-bottom: 25px;
            font-weight: bold;
          }
          .field {
            margin-bottom: 20px;
          }
          .label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #85736c;
            margin-bottom: 5px;
            font-family: monospace;
          }
          .value {
            font-size: 16px;
            color: #1d1b18;
          }
          .message-box {
            background: #fdfaf6;
            padding: 20px;
            border-left: 4px solid #d84315;
            margin-top: 10px;
            white-space: pre-wrap;
            font-size: 15px;
            line-height: 1.6;
            color: #322f2b;
          }
          .footer {
            font-size: 11px;
            color: #85736c;
            border-top: 1px solid #f4eade;
            padding-top: 15px;
            margin-top: 30px;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            📬 New Portfolio Connection Logged
          </div>
          <div class="field">
            <div class="label">Sender Name</div>
            <div class="value"><strong>${name}</strong></div>
          </div>
          <div class="field">
            <div class="label">Email Address</div>
            <div class="value"><a href="mailto:${email}" style="color: #d84315; text-decoration: none;">${email}</a></div>
          </div>
          <div class="field">
            <div class="label">Transmission Message</div>
            <div class="message-box">${message}</div>
          </div>
          <div class="footer">
            Logged at: ${new Date().toLocaleString()}<br>
            Origin: abhishekrai.dev
          </div>
        </div>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: `Portfolio Contact <${senderFrom}>`,
        to: [receiverEmail],
        reply_to: email,
        subject: `New message from ${name} (${email})`,
        html: notificationEmailHtml
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Resend error: ${errorText}`);
    }

    // Commit submission to KV storage on successful Resend dispatch
    if (kv) {
      await kv.put(emailKey, "true");
    }

    // Optional Discord Webhook integration
    const webhookUrl = env?.CONTACT_DISCORD_WEBHOOK || globalThis?.CONTACT_DISCORD_WEBHOOK;
    if (webhookUrl) {
      const payload = {
        embeds: [
          {
            title: "📬 New Transmission from Portfolio",
            color: 14172949, // #d84315
            fields: [
              { name: "Sender", value: name, inline: true },
              { name: "Email", value: email, inline: true },
              { name: "Message", value: message }
            ],
            timestamp: new Date().toISOString()
          }
        ]
      };

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Transmission received." }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Submit contact error:", err.message);
    return new Response(
      JSON.stringify({ success: false, message: "Transmission failed." }), // Generic error response to hide details
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/* ---------------- Ghost Deploy API ----------------
   Run format v2: inputs are [ms, "U"|"D"|"L"|"R", 1|0].
   Async ghost relay on Cloudflare KV (free tier).
   GET  /api/ghost?seed=YYYY-MM-DD  -> { ghost, plays }
   POST /api/ghost                  -> stores a winning run as the
                                       active ghost if it is the fastest
   --------------------------------------------------- */

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

async function handleGhostGet(request, env) {
  const url = new URL(request.url);
  const seed = url.searchParams.get("seed") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(seed)) {
    return jsonResponse({ error: "Invalid seed." }, 400);
  }
  const kv = env?.PORTFOLIO_KV;
  if (!kv) return jsonResponse({ ghost: null, plays: 0, mode: "offline" });

  const ghost = await kv.get(`ghost:${seed}`, { type: "json", cacheTtl: 60 });
  const res = jsonResponse({ ghost: ghost || null });
  // the ghost changes rarely; let the edge and browsers reuse it briefly
  res.headers.set("Cache-Control", "public, max-age=30");
  return res;
}

async function handleGhostPost(request, env) {
  try {
    const kv = env?.PORTFOLIO_KV;
    if (!kv) return jsonResponse({ stored: false, reason: "relay-offline" }, 503);

    // Payload size guard (~16 KB max — a full 60s recording is ~4-8 KB)
    const len = Number(request.headers.get("Content-Length") || 0);
    if (len > 20000) return jsonResponse({ stored: false, reason: "payload-too-large" }, 413);

    const body = await request.json();
    const { v, seed, inputs, durationMs, result } = body || {};

    // Seed must be today or yesterday (UTC) so replays always match the live map
    const seedOk = /^\d{4}-\d{2}-\d{2}$/.test(seed || "");
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (v !== 2 || !seedOk || (seed !== today && seed !== yesterday)) {
      return jsonResponse({ stored: false, reason: "bad-seed" }, 400);
    }

    // Only winning runs may become ghosts (a losing ghost can never exit)
    if (result !== "win" || typeof durationMs !== "number" || durationMs <= 0 || durationMs > 61000) {
      return jsonResponse({ stored: false, reason: "invalid-run" }, 400);
    }

    // Input recording validation: monotonic timestamps, sane key codes
    if (!Array.isArray(inputs) || inputs.length < 2 || inputs.length > 1500) {
      return jsonResponse({ stored: false, reason: "invalid-inputs" }, 400);
    }
    let lastT = -1;
    for (const ev of inputs) {
      if (!Array.isArray(ev) || ev.length !== 3) {
        return jsonResponse({ stored: false, reason: "invalid-inputs" }, 400);
      }
      const [t, code, type] = ev;
      if (typeof t !== "number" || t < 0 || t > 61000 || t < lastT) {
        return jsonResponse({ stored: false, reason: "invalid-inputs" }, 400);
      }
      if (typeof code !== "string" || code.length > 20 || (type !== 0 && type !== 1)) {
        return jsonResponse({ stored: false, reason: "invalid-inputs" }, 400);
      }
      lastT = t;
    }

    if (durationMs < inputs[inputs.length - 1][0]) {
      return jsonResponse({ stored: false, reason: "invalid-run" }, 400);
    }

    // Compare first: a slower run costs no writes at all (free plan: 1,000 writes a day)
    const ghostKey = `ghost:${seed}`;
    const existing = await kv.get(ghostKey, "json");
    if (existing && typeof existing.durationMs === "number" && existing.durationMs <= durationMs) {
      return jsonResponse({ stored: false, reason: "slower-than-active-ghost" });
    }

    // Per-IP rate limit, written only for runs that would be stored
    const ip = request.headers.get("CF-Connecting-IP") || "anon";
    const rlKey = `rl:ghost:${ip}:${Math.floor(Date.now() / 60000)}`;
    const hits = (await kv.get(rlKey, "json")) || 0;
    if (hits >= 3) return jsonResponse({ stored: false, reason: "rate-limited" }, 429);
    await kv.put(rlKey, JSON.stringify(hits + 1), { expirationTtl: 130 });

    await kv.put(
      ghostKey,
      JSON.stringify({ v, seed, inputs, durationMs, result, createdAt: new Date().toISOString() }),
      { expirationTtl: 172800 } // ghost expires after 48h
    );

    return jsonResponse({ stored: true });
  } catch (err) {
    console.error("Ghost submit error:", err.message);
    return jsonResponse({ stored: false, reason: "server-error" }, 500);
  }
}
