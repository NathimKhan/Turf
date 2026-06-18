const nodemailer = require("nodemailer");

function isEmailSimulationEnabled() {
  return !(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransporter() {
  if (!isEmailSimulationEnabled()) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

async function sendEmail({ to, subject, html, text }) {
  const transporter = createTransporter();

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || "TURFX <no-reply@turfx.local>",
    to,
    subject,
    text,
    html,
  });
}

async function sendPasswordResetEmail(user, resetToken, req) {
  const clientUrl = process.env.CLIENT_URL || `${req.protocol}://${req.get("host")}`;
  const resetUrl = `${clientUrl.replace(/\/$/, "")}/reset-password?token=${resetToken}`;

  return sendEmail({
    to: user.email,
    subject: "Reset your TURFX password",
    text: `Reset your TURFX password using this link: ${resetUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Reset your TURFX password</h2>
        <p>Hello ${user.name},</p>
        <p>Use the secure link below to reset your password. It expires in 15 minutes.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you did not ask for this, you can ignore this email.</p>
      </div>
    `,
  });
}

module.exports = {
  isEmailSimulationEnabled,
  sendEmail,
  sendPasswordResetEmail,
};
