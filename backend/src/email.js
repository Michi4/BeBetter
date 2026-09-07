const nodemailer = require('nodemailer');

const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.world4you.com',
  port: smtpPort,
  secure: smtpPort === 465, // implicit TLS on 465, STARTTLS on 587
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  auth: {
    user: process.env.SMTP_USER || 'office@websters.at',
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail({ to, subject, html, text }) {
  if (!process.env.SMTP_PASS) {
    console.warn('SMTP_PASS not configured, skipping email');
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"BeBetter" <${process.env.SMTP_USER || 'office@websters.at'}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });
    console.log('Email sent:', info.messageId);
    return info;
  } catch (e) {
    console.error('Email send failed:', e);
    throw e;
  }
}

module.exports = { sendEmail, transporter };
