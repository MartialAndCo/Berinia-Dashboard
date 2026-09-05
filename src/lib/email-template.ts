export function getEmailTemplate(title: string, contentHtml: string, category: string = 'TRANSACTIONAL') {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="background-color: #f6f4f0; margin: 0; padding: 0;">
  <div style="background-color: #f6f4f0; padding: 40px 20px;">
    <div style="max-width: 560px; margin: 0 auto; background-color: #f6f4f0;">
      
      <!-- Header -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-bottom: 1px solid #e2dfd8; margin-bottom: 40px;">
        <tr>
          <td style="padding-bottom: 24px;">
            <a href="https://www.berinagents.com" style="text-decoration: none; display: inline-block;">
              <img src="https://www.berinagents.com/logo-horizontal-black.png" alt="BerinAgents" height="26" style="height: 26px; width: auto; max-height: 26px; border: 0; outline: none; display: block; font-family: 'Georgia', serif; font-size: 20px; font-weight: bold; color: #1a1918;" />
            </a>
          </td>
          <td align="right" style="padding-bottom: 24px; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #737373; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; vertical-align: middle;">
            ${category}
          </td>
        </tr>
      </table>
      
      <!-- Content -->
      <div style="color: #202020; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        ${contentHtml}
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #e2dfd8; padding-top: 24px; margin-top: 48px; font-size: 12px; color: #737373; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        Sent by BerinAgents &middot; Enterprise Voice AI Platform
      </div>

    </div>
  </div>
</body>
</html>
  `
}
