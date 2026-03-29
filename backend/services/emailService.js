/**
 * Email Service
 * Sends OTP and notifications via Nodemailer
 */
import nodemailer from "nodemailer";

const getMailFrom = () => {
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const fromName = process.env.EMAIL_FROM_NAME || "Pulse Chat";
  return `"${fromName}" <${fromEmail}>`;
};

// Create transporter (works in dev + production)
const createTransporter = () => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  if (!process.env.EMAIL_FROM) {
    console.warn(
      "⚠️ EMAIL_FROM is not set. Falling back to EMAIL_USER as the sender address. " +
      "This may be rejected by Brevo unless that sender is verified."
    );
  }

  // Optional: verify connection
  transporter.verify((error, success) => {
    if (error) {
      console.error("❌ SMTP Error:", error);
    } else {
      console.log("✅ SMTP Ready");
    }
  });

  return transporter;
};

// ─── Send OTP Email ───────────────────────────────────────────────────────────
export const sendOTPEmail = async (
  email,
  otp,
  username,
  type = "verification"
) => {
  const transporter = createTransporter();

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
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #2d6a4f, #40916c); padding: 40px 32px; text-align: center; }
          .logo { color: #fff; font-size: 28px; font-weight: 700; }
          .logo span { color: #74c69d; }
          .body { padding: 40px 32px; }
          h2 { color: #1b1b1b; }
          p { color: #555; }
          .otp-box { background: #f0faf5; border: 2px dashed #40916c; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
          .otp { font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #2d6a4f; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Pulse<span>Chat</span></div>
          </div>
          <div class="body">
            <h2>${titles[type]}</h2>
            <p>Hi ${username}, ${messages[type]}</p>
            <div class="otp-box">
              <div class="otp">${otp}</div>
              <p>Expires in 10 minutes</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: getMailFrom(),
      to: email,
      subject: subjects[type],
      text: `${messages[type]} ${otp}`,
      html,
    });

    console.log("📧 Email sent:", info.messageId, "from", getMailFrom(), "to", email);
  } catch (error) {
    console.error("❌ Email failed:", error?.message || error);
    throw error;
  }
};
