/**
 * Email Service
 * Sends OTP using Brevo API (NO SMTP)
 */

import SibApiV3Sdk from 'sib-api-v3-sdk';

// ─── Setup Brevo Client ─────────────────────────────────────
const client = SibApiV3Sdk.ApiClient.instance;
client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

// ─── Get sender ─────────────────────────────────────────────
const getMailFrom = () => {
  return {
    email: process.env.BREVO_SENDER_EMAIL, // must be verified in Brevo
    name: process.env.EMAIL_FROM_NAME || "Pulse Chat",
  };
};

// ─── Send OTP Email ─────────────────────────────────────────
export const sendOTPEmail = async (
  email,
  otp,
  username,
  type = "verification"
) => {
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  const subjects = {
    verification: "Verify your Pulse Chat account",
    password_reset: "Reset your Pulse Chat password",
  };

  const titles = {
    verification: "Verify Your Email",
    password_reset: "Reset Your Password",
  };

  const messages = {
    verification: `Welcome to Pulse Chat! Your verification code is:`,
    password_reset: `You requested a password reset. Your OTP is:`,
  };

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial; background:#f5f5f5; padding:20px;">
        <div style="max-width:480px;margin:auto;background:#fff;border-radius:12px;padding:30px;">
          <h2>${titles[type]}</h2>
          <p>Hi ${username}, ${messages[type]}</p>
          <div style="text-align:center;margin:20px 0;">
            <h1 style="letter-spacing:8px;color:#2d6a4f;">${otp}</h1>
            <p>Expires in 10 minutes</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const response = await apiInstance.sendTransacEmail({
      sender: getMailFrom(),
      to: [{ email }],
      subject: subjects[type],
      htmlContent: html,
    });

    console.log("📧 Email sent:", response.messageId);
  } catch (error) {
    console.error(
      "❌ Brevo Email Error:",
      error.response?.body || error.message
    );

    // ❗ Do NOT throw (prevents breaking registration)
  }
};