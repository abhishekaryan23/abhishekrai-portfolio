export async function onRequestPost(context) {
  try {
    const { request, env } = context;
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

    const resendApiKey = env.RESEND_API_KEY;
    const receiverEmail = env.CONTACT_RECEIVER_EMAIL || "abhishekaryan23@gmail.com";
    const senderFrom = env.CONTACT_FROM_EMAIL || "onboarding@resend.dev";

    if (resendApiKey) {
      // 1. Send Acknowledgement Email to the Visitor
      const visitorEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Transmission Acknowledged</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
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
              font-size: 24px;
              color: #d84315;
              border-bottom: 1px solid #ffefe8;
              padding-bottom: 20px;
              margin-bottom: 30px;
              letter-spacing: -0.02em;
            }
            .content {
              font-size: 16px;
              line-height: 1.6;
              color: #5a544c;
              margin-bottom: 40px;
            }
            .highlight {
              color: #1d1b18;
              font-weight: 600;
            }
            .footer {
              font-size: 12px;
              color: #85736c;
              border-top: 1px solid #f4eade;
              padding-top: 20px;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              AbhishekRai.Dev / System Receipt
            </div>
            <div class="content">
              <p>Hello <span class="highlight">${name}</span>,</p>
              
              <p>Thank you for initiating communication through my edge portfolio network. I have received your transmission and logged it securely.</p>
              
              <p>I review collaboration requests and technical inquiries daily, and I will get back to you as soon as possible to discuss your thoughts.</p>
              
              <p>Sovereign regards,</p>
              <p><span class="highlight">Abhishek Rai</span><br>Edge Intelligence Architect</p>
            </div>
            <div class="footer">
              UTC Connection: ${new Date().toUTCString()}<br>
              Host: https://abhishekrai.dev
            </div>
          </div>
        </body>
        </html>
      `;

      // 2. Send Notification Email to Abhishek Rai
      const notificationEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>New Portfolio Message</title>
        </head>
        <body style="font-family: sans-serif; padding: 20px; background: #fafafa;">
          <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border: 1px solid #ccc;">
            <h2 style="color: #d84315; margin-top: 0;">📬 New Message Logged</h2>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            <div style="background: #fdfaf6; padding: 20px; border-left: 4px solid #d84315; margin-top: 20px;">
              <p style="margin: 0; white-space: pre-wrap; font-size: 15px; line-height: 1.6; color: #333;">${message}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const sendEmail = async (to, subject, html) => {
        return fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: `Abhishek Rai <${senderFrom}>`,
            to: [to],
            subject: subject,
            html: html
          })
        });
      };

      await Promise.all([
        sendEmail(email, "Receipt of Transmission / AbhishekRai.Dev", visitorEmailHtml),
        sendEmail(receiverEmail, `New Portfolio Message from ${name}`, notificationEmailHtml)
      ]);
    }

    // Optional Discord Webhook integration
    const webhookUrl = env.CONTACT_DISCORD_WEBHOOK;
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
    return new Response(
      JSON.stringify({ success: false, message: `Server error: ${err.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
