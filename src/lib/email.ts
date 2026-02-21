import { Resend } from 'resend';
import crypto from 'crypto';
import db from '@/lib/db';

// Lazy initialization — only create Resend client when actually needed
// This prevents crashes when RESEND_API_KEY is not set but other
// server actions in auth-actions.ts import from this module chain
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendPasswordResetEmail(email: string) {
  // Check if user exists (but don't reveal this to caller)
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    // Return success even if user doesn't exist (security)
    return { success: true };
  }

  // Delete any existing tokens for this email
  await db.passwordResetToken.deleteMany({ where: { email } });

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.passwordResetToken.create({
    data: {
      email,
      token,
      expires,
    },
  });

  const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  // In development, log to console if no API key
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_your_api_key_here') {
    console.log('=== Password Reset Email (dev mode) ===');
    console.log('To:', email);
    console.log('Reset Link:', resetLink);
    console.log('========================================');
    return { success: true };
  }

  try {
    const resend = getResendClient();
    if (!resend) return { success: true };
    await resend.emails.send({
      from: 'Community <onboarding@resend.dev>', // Use Resend's test domain
      to: email,
      subject: 'Reset your password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Reset your password</h1>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <p style="margin: 24px 0;">
            <a href="${resetLink}" style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Reset Password
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            This link expires in 1 hour. If you didn't request this, ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">
            If the button doesn't work, copy and paste this link: ${resetLink}
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    // Still return success to not reveal email existence
  }

  return { success: true };
}
