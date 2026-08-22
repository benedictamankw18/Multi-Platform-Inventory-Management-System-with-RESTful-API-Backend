

const mailConfig = {
  host: process.env.Email_HOST,
  port: process.env.Email_PORT,
  user: process.env.Email_USER,
  password: process.env.Email_PASSWORD,
}

module.exports = mailConfig;