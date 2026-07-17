export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { name, email, message } = body;

    // Validate inputs on server side
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

    // Optional forwarding log: If Discord webhook is provided in the Cloudflare settings
    const webhookUrl = env.CONTACT_DISCORD_WEBHOOK;
    if (webhookUrl) {
      const payload = {
        embeds: [
          {
            title: "📬 New Transmission from Portfolio",
            color: 14172949, // #d84315 Warm Vermilion
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

    // Success response
    return new Response(
      JSON.stringify({ success: true, message: "Transmission received." }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: `Server error: ${err.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
