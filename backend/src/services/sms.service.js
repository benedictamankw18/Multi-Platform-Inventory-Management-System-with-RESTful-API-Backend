const https = require('https');
const url = require('url');

async function sendSmsViaAgoo({ to, message, senderId } = {}) {
  const apiUrl = process.env.AGOOSMS_API_URL;
  const apiKey = process.env.AGOOSMS_API_KEY;
  const defaultSender = process.env.AGOOSMS_SENDER_ID;
  const resolvedSenderId = senderId || defaultSender;

  if (!apiUrl || !apiKey || !resolvedSenderId) {
    console.log('[sms.service] AgooSMS not configured.');
    console.log('SMS TO:', to);
    console.log('MSG:', message);
    console.log('SENDER ID:', resolvedSenderId);
    return { success: false, error: 'AgooSMS not configured' };
  }

  const parsed = url.parse(apiUrl);
  const payload = JSON.stringify({ to, message, senderId: resolvedSenderId });

  const options = {
    hostname: parsed.hostname,
    port: parsed.port || 443,
    path: parsed.path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'X-API-Key': apiKey,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let body = data;
        try { body = JSON.parse(data); } catch (e) { /* ignore parse error */ }
        const success = res.statusCode >= 200 && res.statusCode < 300;
        resolve({ success, statusCode: res.statusCode, body });
      });
    });
    req.on('error', (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

async function sendPasswordResetSms(user, token) {
  const baseUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl.replace(/\/$/, '')}/auth/reset-password?token=${encodeURIComponent(token)}`;
  const message = `Reset your password using this link: ${resetUrl}`;
  const phone = user.phone || user.mobile || user.msisdn;
  if (!phone) return { success: false, error: 'No phone number' };
  return sendSmsViaAgoo({ to: phone, message });
}

module.exports = {
  sendSmsViaAgoo,
  sendPasswordResetSms,
};
