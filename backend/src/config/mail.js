

const mailConfig = {
  host: process.env.Email_HOST,
  port: process.env.Email_PORT,
  user: process.env.Email_USER,
  password: process.env.Email_PASSWORD,
  // True only when a host is configured. When false, email.service.js skips the
  // SMTP transport entirely and logs the message instead of failing on connect.
  configured: Boolean(process.env.Email_HOST && String(process.env.Email_HOST).trim()),
}

module.exports = mailConfig;