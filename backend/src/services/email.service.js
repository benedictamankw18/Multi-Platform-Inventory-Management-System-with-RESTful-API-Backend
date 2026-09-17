const mailConfig = require('../config/mail');
const businessRepo = require('../repositories/business.repository');

let cachedBusiness = null;

async function getBusinessInfo() {
  if (cachedBusiness) return cachedBusiness;
  const row = await businessRepo.getBusiness();
  if (row) {
    cachedBusiness = {
      business_name: row.business_name || 'Business',
      address: row.address || '',
      phone: row.phone || '',
      business_email: row.business_email || '',
      logo: row.logo || '',
      website: row.website || '',
    };
  } else {
    cachedBusiness = {
      business_name: 'Business',
      address: '',
      phone: '',
      business_email: '',
      logo: '',
      website: '',
    };
  }
  return cachedBusiness;
}

function refreshBusinessInfo() {
  cachedBusiness = null;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildLayout(contentHtml, biz) {
  const year = new Date().getFullYear();
  const logoHtml = biz.logo
    ? `<img src="${escapeHtml(biz.logo)}" alt="${escapeHtml(biz.business_name)}" style="max-height:40px;vertical-align:middle;margin-right:10px" />`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(biz.business_name)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f5f7;min-width:100%">
    <tr>
      <td align="center" style="padding:40px 16px">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
          <tr>
            <td style="padding:24px 32px 16px;border-bottom:1px solid #e5e7eb">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="left" style="font-size:18px;font-weight:600;color:#1f2937">
                    ${logoHtml}${escapeHtml(biz.business_name)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;font-size:15px;line-height:1.6;color:#374151">
              ${contentHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;border-radius:0 0 8px 8px;text-align:center;font-size:12px;line-height:1.6;color:#6b7280">
              <p style="margin:0 0 4px;font-weight:600;color:#4b5563">${escapeHtml(biz.business_name)}</p>
              ${biz.address ? `<p style="margin:0 0 4px">${escapeHtml(biz.address)}</p>` : ''}
              ${biz.phone || biz.business_email ? `<p style="margin:0 0 4px">${[biz.phone, biz.business_email].filter(Boolean).join(' | ')}</p>` : ''}
              <p style="margin:0">&copy; ${year} ${escapeHtml(biz.business_name)}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendMail({ to, subject, text, html } = {}) {
  try {
    const nodemailer = require('nodemailer');
    // Implicit TLS (secure: true) on port 465; STARTTLS otherwise. Email_SECURE overrides.
    const port = Number(mailConfig.port) || 465;
    const secure = process.env.Email_SECURE != null
      ? String(process.env.Email_SECURE).toLowerCase() === 'true'
      : port === 465;
    const transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port,
      auth: mailConfig.user ? { user: mailConfig.user, pass: mailConfig.password } : undefined,
      secure,
    });

    let finalHtml = html;
    if (html && !html.includes('<!DOCTYPE html>')) {
      const biz = await getBusinessInfo();
      finalHtml = buildLayout(html, biz);
    }

    const info = await transporter.sendMail({ from: mailConfig.user || 'no-reply@example.com', to, subject, text, html: finalHtml });
    return { success: true, info };
  } catch (err) {
    console.warn('[email.service] nodemailer not available or send failed, falling back to log. Error:', err && err.message);
    console.log('EMAIL TO:', to);
    console.log('SUBJECT:', subject);
    console.log('TEXT:', text);
    return { success: false, error: err && err.message };
  }
}

async function sendPasswordResetEmail(user, token) {
  const baseUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl.replace(/\/$/, '')}/auth/reset-password?token=${encodeURIComponent(token)}`;
  const subject = 'Password Reset Request';
  const biz = await getBusinessInfo();
  const name = user.full_name || user.username || 'User';
  const text = `Hello ${name},\n\nWe received a request to reset your password. Use the link below to reset it:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this message.\n\n${biz.business_name}\n${biz.address || ''}\n${biz.phone || ''} | ${biz.business_email || ''}`;
  const html = `
    <p style="margin:0 0 16px">Hello <strong>${escapeHtml(name)}</strong>,</p>
    <p style="margin:0 0 16px">We received a request to reset the password for your ${escapeHtml(biz.business_name)} account. Click the button below to set a new password:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0">
      <tr>
        <td align="center" style="background-color:#3b82f6;border-radius:6px">
          <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:12px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px">Reset Password</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 16px;font-size:13px;color:#6b7280">This link will expire in <strong>1 hour</strong>. If you did not request a password reset, please ignore this email.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
    <p style="margin:0;font-size:13px;color:#6b7280">For security reasons, never share this link with anyone. Our team will never ask for your password.</p>
  `;
  return sendMail({ to: user.email, subject, text, html });
}

module.exports = {
  sendMail,
  sendPasswordResetEmail,
  getBusinessInfo,
  refreshBusinessInfo,
};
