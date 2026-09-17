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

  const endpoint = apiUrl.replace(/\/+$/, '') + '/v1/sms/send';
  const parsed = url.parse(endpoint);
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

function agooBaseUrl() {
  let base = process.env.AGOOSMS_BASE_URL || process.env.AGOOSMS_API_URL || '';
  base = base.replace(/\/+$/, '');
  return base.replace(/\/v1(\/sms)?(\/send)?$/i, '');
}

function agooRequest(method, path) {
  const apiKey = process.env.AGOOSMS_API_KEY;
  const parsed = url.parse(agooBaseUrl() + path);

  const options = {
    hostname: parsed.hostname,
    port: parsed.port || 443,
    path: parsed.path,
    method,
    headers: { 'X-API-Key': apiKey },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let body = data;
        try { body = JSON.parse(data); } catch (e) { /* ignore parse error */ }
        resolve({ statusCode: res.statusCode, body });
      });
    });
    req.on('error', (e) => reject(e));
    req.end();
  });
}

async function getAgooBalance() {
  if (!process.env.AGOOSMS_API_KEY) {
    return { success: false, statusCode: null, error: 'AgooSMS not configured' };
  }

  const res = await agooRequest('GET', '/v1/balance');
  const ok = res.statusCode >= 200 && res.statusCode < 300;
  const payload = (res.body && res.body.data) || {};

  return {
    success: ok,
    statusCode: res.statusCode,
    balance: typeof payload.balance === 'number' ? payload.balance : null,
    currency: payload.currency || null,
    error: !ok ? (res.body && (res.body.error || res.body.message)) || `Agoo error (${res.statusCode})` : null,
  };
}

module.exports = {
  sendSmsViaAgoo,
  sendPasswordResetSms,
  getAgooBalance,
};
