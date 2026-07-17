export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Fetch static asset or API route response
    let response;
    if (url.pathname === "/functions/submit-contact" && request.method === "POST") {
      response = await handleContactSubmit(request, env);
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
