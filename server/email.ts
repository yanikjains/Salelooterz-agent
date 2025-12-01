import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// Email service for sending password reset codes
export async function sendPasswordResetEmail(email: string, resetCode: string): Promise<boolean> {
  try {
    // Check if SMTP credentials are available
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.SMTP_FROM_EMAIL || "noreply@affiliatebot.com";

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn("SMTP credentials not configured. Password reset email not sent.");
      console.warn("To enable email: Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS environment variables");
      return false;
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpPort === "465",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Send email
    const mailOptions = {
      from: fromEmail,
      to: email,
      subject: "Password Reset - Amazon Affiliate Bot",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hello,</p>
          <p>We received a request to reset your password. Use the code below to create a new password:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <code style="font-size: 24px; font-weight: bold; color: #000; letter-spacing: 2px;">
              ${resetCode}
            </code>
          </div>
          
          <p>This code will expire in 1 hour.</p>
          <p>If you didn't request this password reset, you can safely ignore this email.</p>
          
          <hr style="border: none; border-top: 1px solid #ccc; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            © 2024 India's First Smart Amazon Affiliate Bot. All rights reserved.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return false;
  }
}
