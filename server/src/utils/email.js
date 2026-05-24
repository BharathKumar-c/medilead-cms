const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

/**
 * Initialise the nodemailer transport using environment variables.
 * Call this once at startup.
 */
function initTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // If no SMTP host is configured, use a dummy / json transport for dev
  if (!host) {
    logger.warn('SMTP_HOST not set — emails will be logged to console only');
    transporter = {
      sendMail: async (mailOptions) => {
        logger.info('[DEV EMAIL]', { to: mailOptions.to, subject: mailOptions.subject });
        return { messageId: `dev-${Date.now()}@local` };
      },
    };
    return;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  // Verify connection
  transporter.verify((err) => {
    if (err) {
      logger.error('SMTP connection verification failed', { error: err.message });
    } else {
      logger.info('SMTP transporter ready');
    }
  });
}

/**
 * Send an email.
 * Falls back to console logging if SMTP is not configured.
 */
async function sendEmail({ to, subject, html }) {
  if (!transporter) {
    initTransporter();
  }

  const from = process.env.SMTP_FROM || 'noreply@medilead.app';

  try {
    const info = await transporter.sendMail({ from, to, subject, html });
    logger.info('Email sent', { to, subject, messageId: info.messageId });
    return info;
  } catch (err) {
    logger.error('Failed to send email', { to, subject, error: err.message });
    throw err;
  }
}

/**
 * Build an HTML email body for a password reset link.
 */
function buildResetEmail({ to, link, expiresInMinutes }) {
  const appName = 'Medway';
  return {
    to,
    subject: `${appName} — Password Reset Request`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center">
            <table width="480" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; padding: 32px;">
              <tr>
                <td align="center" style="padding-bottom: 16px;">
                  <div style="width: 56px; height: 56px; background: #0051d5; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center;">
                    <span style="color: white; font-size: 28px; font-weight: bold;">M</span>
                  </div>
                </td>
              </tr>
              <tr><td align="center" style="font-size: 22px; font-weight: 700; color: #0b1c30; padding-bottom: 8px;">Password Reset</td></tr>
              <tr><td align="center" style="font-size: 14px; color: #45464d; padding-bottom: 24px;">
                You requested a password reset for your ${appName} account.
                Click the button below to set a new password. This link expires in ${expiresInMinutes} minutes.
              </td></tr>
              <tr><td align="center" style="padding-bottom: 24px;">
                <a href="${link}" style="display: inline-block; background: #0051d5; color: #ffffff; font-size: 16px; font-weight: 700; padding: 14px 36px; border-radius: 10px; text-decoration: none;">
                  Reset Password
                </a>
              </td></tr>
              <tr><td align="center" style="font-size: 12px; color: #76777d;">
                If you did not request this, please ignore this email. Your password will remain unchanged.
              </td></tr>
              <tr><td align="center" style="font-size: 12px; color: #76777d; padding-top: 16px; border-top: 1px solid #e0e0e0; margin-top: 16px;">
                © ${new Date().getFullYear()} JIREH Technologies
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  };
}

module.exports = { initTransporter, sendEmail, buildResetEmail };
