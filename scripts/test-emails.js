require('dotenv').config({ path: '.env.local' });
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

function getEmailTemplate(title, contentHtml, category = 'TRANSACTIONAL') {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="background-color: #f6f4f0; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="background-color: #f6f4f0; padding: 48px 20px;">
    <div style="max-width: 560px; margin: 0 auto; background-color: #f6f4f0;">
      
      <!-- Header -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-bottom: 1px solid #e2dfd8; margin-bottom: 40px;">
        <tr>
          <td style="padding-bottom: 24px;">
            <a href="https://www.berinagents.com" style="text-decoration: none; display: inline-block;">
              <img src="https://www.berinagents.com/logo-horizontal-black.png" alt="BerinAgents" height="26" style="height: 26px; width: auto; max-height: 26px; border: 0; outline: none; display: block; font-family: 'Georgia', serif; font-size: 20px; font-weight: bold; color: #1a1918;" />
            </a>
          </td>
          <td align="right" style="padding-bottom: 24px; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #73706b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; vertical-align: middle; font-weight: 600;">
            ${category}
          </td>
        </tr>
      </table>
      
      <!-- Content -->
      <div style="color: #1a1918; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        ${contentHtml}
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #e2dfd8; padding-top: 24px; margin-top: 48px; font-size: 12px; color: #73706b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6;">
        Sent by BerinAgents &middot; Enterprise Voice AI Platform<br/>
        <a href="https://www.berinagents.com" style="color: #9e4733; text-decoration: none;">www.berinagents.com</a>
      </div>

    </div>
  </div>
</body>
</html>
  `;
}

async function run() {
  const recipients = ['contact.flinger@gmail.com', 'yannrosemark@gmail.com'];
  console.log('Target recipients:', recipients);

  // 1. Welcome / Access Setup Email
  const contentWelcome = `
    <div style="font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #9e4733; margin-bottom: 12px;">
      <span style="color: #9e4733; margin-right: 4px;">&#8226;</span> BERINAGENTS
    </div>
    <h1 style="font-family: 'Georgia', serif; font-size: 32px; font-weight: bold; color: #1a1918; margin: 0 0 24px 0; letter-spacing: -0.5px;">Welcome</h1>
    <div style="border-bottom: 1px solid #e2dfd8; margin-bottom: 32px;"></div>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #1a1918;">Hello ACME Corp,</p>
    <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #403e3b;">Your BerinAgents client portal has been successfully created. You can now monitor your voice agents, review live call recordings, and track usage in real time.</p>
    
    <div style="margin: 36px 0;">
      <a href="https://www.berinagents.com/update-password" style="background-color: #1a1918; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 12px; letter-spacing: 1px; display: inline-block; text-transform: uppercase;">
        <span style="color: #9e4733; margin-right: 8px; font-size: 14px;">&#8226;</span> SET UP MY PASSWORD
      </a>
    </div>
    
    <p style="color: #73706b; font-size: 13px; margin-top: 36px; line-height: 1.6;">
      If the button does not work, copy and paste this link:<br/>
      <a href="https://www.berinagents.com/update-password" style="color: #1a1918; text-decoration: underline; word-break: break-all;">https://www.berinagents.com/update-password</a>
    </p>
  `;

  // 2. Password Reset Email
  const contentReset = `
    <div style="font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #9e4733; margin-bottom: 12px;">
      <span style="color: #9e4733; margin-right: 4px;">&#8226;</span> BERINAGENTS
    </div>
    <h1 style="font-family: 'Georgia', serif; font-size: 32px; font-weight: bold; color: #1a1918; margin: 0 0 24px 0; letter-spacing: -0.5px;">Password Reset</h1>
    <div style="border-bottom: 1px solid #e2dfd8; margin-bottom: 32px;"></div>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #1a1918;">Hello,</p>
    <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #403e3b;">We received a request to reset your password for your BerinAgents account. This secure link is valid for 24 hours.</p>
    
    <div style="margin: 36px 0;">
      <a href="https://www.berinagents.com/reset-password" style="background-color: #1a1918; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 12px; letter-spacing: 1px; display: inline-block; text-transform: uppercase;">
        <span style="color: #9e4733; margin-right: 8px; font-size: 14px;">&#8226;</span> RESET MY PASSWORD
      </a>
    </div>
    
    <p style="color: #73706b; font-size: 13px; margin-top: 36px; line-height: 1.6;">
      If you did not request this, you can safely ignore this email.<br/><br/>
      If the button does not work, copy and paste this link:<br/>
      <a href="https://www.berinagents.com/reset-password" style="color: #1a1918; text-decoration: underline; word-break: break-all;">https://www.berinagents.com/reset-password</a>
    </p>
  `;

  // 3. Invoice Email
  const contentInvoice = `
    <div style="font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #9e4733; margin-bottom: 12px;">
      <span style="color: #9e4733; margin-right: 4px;">&#8226;</span> BERINAGENTS
    </div>
    <h1 style="font-family: 'Georgia', serif; font-size: 32px; font-weight: bold; color: #1a1918; margin: 0 0 24px 0; letter-spacing: -0.5px;">Your invoice is ready</h1>
    <div style="border-bottom: 1px solid #e2dfd8; margin-bottom: 32px;"></div>
    
    <p style="margin: 0 0 28px 0; font-size: 16px; line-height: 1.6; color: #403e3b;">Your usage for this billing period has been calculated. Your card on file will be charged automatically — no action required on your part.</p>
    
    <div style="background-color: #f0ede6; border: 1px solid #e2dfd8; padding: 20px 24px; margin-bottom: 36px;">
      <div style="font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #73706b; margin-bottom: 12px;">
        Billing Summary
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 15px; color: #1a1918; line-height: 2;">
        <tr>
          <td>Monthly Platform Subscription</td>
          <td align="right" style="font-weight: 600; font-family: monospace; font-size: 15px;">€500.00</td>
        </tr>
        <tr>
          <td>Voice AI Usage (350 min @ €0.06/min)</td>
          <td align="right" style="font-weight: 600; font-family: monospace; font-size: 15px;">€21.00</td>
        </tr>
        <tr style="border-top: 1px solid #dcd7ce;">
          <td style="padding-top: 10px; font-weight: bold; font-size: 16px;">Total Billed</td>
          <td align="right" style="padding-top: 10px; font-weight: bold; font-size: 18px; color: #9e4733; font-family: monospace;">€521.00</td>
        </tr>
      </table>
    </div>
    
    <div>
      <a href="https://www.berinagents.com/dashboard" style="background-color: #1a1918; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 12px; letter-spacing: 1px; display: inline-block; text-transform: uppercase;">
        <span style="color: #9e4733; margin-right: 8px; font-size: 14px;">&#8226;</span> VIEW INVOICE
      </a>
    </div>
  `;

  for (const to of recipients) {
    console.log(`\n--- Sending batch to ${to} ---`);
    
    const r1 = await resend.emails.send({
      from: 'BerinAgents <onboarding@berinagents.com>',
      to: [to],
      subject: 'Access your BerinAgents Portal',
      html: getEmailTemplate('Welcome to BerinAgents', contentWelcome, 'ONBOARDING')
    });
    console.log(`[1/3] Welcome email sent:`, r1.data?.id || r1.error);

    const r2 = await resend.emails.send({
      from: 'BerinAgents <security@berinagents.com>',
      to: [to],
      subject: 'Reset your password - BerinAgents',
      html: getEmailTemplate('Password Reset - BerinAgents', contentReset, 'SECURITY')
    });
    console.log(`[2/3] Reset email sent:`, r2.data?.id || r2.error);

    const r3 = await resend.emails.send({
      from: 'BerinAgents Billing <billing@berinagents.com>',
      to: [to],
      subject: 'Your Monthly Invoice - BerinAgents',
      html: getEmailTemplate('Your BerinAgents Invoice', contentInvoice, 'BILLING')
    });
    console.log(`[3/3] Invoice email sent:`, r3.data?.id || r3.error);
  }

  console.log('\nAll emails sent successfully!');
}

run();
