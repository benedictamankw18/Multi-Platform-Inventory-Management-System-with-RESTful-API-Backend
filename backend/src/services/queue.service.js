const { v4: uuidv4 } = require('uuid');
const queueRepo = require('../repositories/queue.repository');
const emailService = require('./email.service');
const smsService = require('./sms.service');

const MAX_RETRIES = Number(process.env.QUEUE_MAX_RETRIES || 5);

async function enqueueMessage(type, payload) {
  const id = uuidv4();
  return queueRepo.enqueueMessage({ id, type, payload, attempts: 0, status: 'PENDING' });
}

async function enqueuePasswordReset(user, token) {
  // enqueue both email and sms entries (if data present)
  const entries = [];
  if (user && user.email) {
    entries.push(await enqueueMessage('email', { user, token, purpose: 'password_reset' }));
  }
  if (user && (user.phone || user.mobile)) {
    entries.push(await enqueueMessage('sms', { user, token, purpose: 'password_reset' }));
  }
  return entries;
}

async function processPending({ limit = 50 } = {}) {
  const items = await queueRepo.getPending({ limit });
  for (const it of items) {
    const id = it.id;
    try {
      await queueRepo.markProcessing(id);
      const payload = it.payload ? JSON.parse(it.payload) : {};
      let res;
      if (it.type === 'email') {
        if (payload.purpose === 'password_reset' && payload.user && payload.token) {
          res = await emailService.sendPasswordResetEmail(payload.user, payload.token);
        } else {
          res = await emailService.sendMail(payload);
        }
      } else if (it.type === 'sms') {
        if (payload.purpose === 'password_reset' && payload.user && payload.token) {
          res = await smsService.sendPasswordResetSms(payload.user, payload.token);
        } else {
          res = await smsService.sendSmsViaAgoo(payload);
        }
      } else {
        throw new Error('Unknown message type: ' + it.type);
      }

      // consider any non-success as failure
      if (res && res.success === false) throw new Error(res.error || 'send failed');

      await queueRepo.markDone(id);
    } catch (err) {
      console.error('[queue.service] processing error for', id, err && err.message);
      await queueRepo.incrementAttempts(id);
      const attemptsRow = await queueRepo.incrementAttempts(id);
      const attempts = attemptsRow ? attemptsRow.attempts : 1;
      if (attempts >= MAX_RETRIES) {
        await queueRepo.markFailed(id, err && err.message);
      } else {
        // exponential backoff: next_try = now + (attempts^2 * 30s)
        const backoffSec = Math.min(Math.pow(attempts, 2) * 30, 3600);
        const nextTry = new Date(Date.now() + backoffSec * 1000).toISOString();
        await queueRepo.updateNextTry(id, nextTry);
      }
    }
  }
  return { processed: items.length };
}

module.exports = {
  enqueueMessage,
  enqueuePasswordReset,
  processPending,
};
