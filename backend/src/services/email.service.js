const mailConfig = require('../config/mail');

async function sendMail({ to, subject, text, html } = {}) {
  // Attempt to use nodemailer if installed; otherwise fallback to console logging
  try {
    // lazy require so missing dependency doesn't crash the app
    // eslint-disable-next-line global-require
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port || 587,
      auth: mailConfig.user ? { user: mailConfig.user, pass: mailConfig.password } : undefined,
      secure: false,
    });
    const info = await transporter.sendMail({ from: mailConfig.user || 'no-reply@example.com', to, subject, text, html });
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
  const subject = 'Password reset request';
  const text = `Hello ${user.full_name || user.username || ''},\n\nWe received a request to reset your password. Use the link below to reset it:\n\n${resetUrl}\n\nIf you did not request this, please ignore this message.`;
  const html = `<p>Hello ${user.full_name || user.username || ''},</p><p>We received a request to reset your password. Click <a href="${resetUrl}">here</a> to reset it.</p>`;
  return sendMail({ to: user.email, subject, text, html });
}

module.exports = {
  sendMail,
  sendPasswordResetEmail,
};
