export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Secure debug helper to list environment keys without leaking secret values
    if (url.pathname === "/debug-env") {
      const envKeys = env ? Object.keys(env) : [];
      const globalKeys = Object.keys(globalThis).filter(k => k.includes("RESEND") || k.includes("CONTACT"));
      return new Response(
        JSON.stringify({
          success: true,
          env_keys: envKeys,
          global_keys: globalKeys,
          has_env_resend: !!env?.RESEND_API_KEY,
          has_global_resend: !!globalThis?.RESEND_API_KEY,
          env_type: typeof env
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Route POST requests for the contact form
    if (url.pathname === "/functions/submit-contact" && request.method === "POST") {
      return handleContactSubmit(request, env);
    }

    // Serve static assets from the public/ folder via the ASSETS binding
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  }
};

async function handleContactSubmit(request, env) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // Server-side validation
    if (!name || name.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "Name is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, message: "A valid email address is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "Message cannot be empty." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Multi-context environment variable fallback selector (module-env, global, and process.env contexts)
    const resendApiKey = env?.RESEND_API_KEY || globalThis?.RESEND_API_KEY || (typeof process !== "undefined" && process.env?.RESEND_API_KEY);
    const receiverEmail = env?.CONTACT_RECEIVER_EMAIL || globalThis?.CONTACT_RECEIVER_EMAIL || (typeof process !== "undefined" && process.env?.CONTACT_RECEIVER_EMAIL) || "abhishekaryan23@gmail.com";
    const senderFrom = env?.CONTACT_FROM_EMAIL || globalThis?.CONTACT_FROM_EMAIL || (typeof process !== "undefined" && process.env?.CONTACT_FROM_EMAIL) || "contact@abhishekrai.dev";

    if (!resendApiKey) {
      console.error("Critical: Resend API key is missing across all binding contexts.");
      return new Response(
        JSON.stringify({ success: false, message: "Server configuration error: Resend API key is missing." }),
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
      throw new Error(`Resend API Error: ${errorText}`);
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
      JSON.stringify({ success: false, message: `${err.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
