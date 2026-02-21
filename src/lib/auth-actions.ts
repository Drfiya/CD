'use server';

import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { registerSchema, forgotPasswordSchema, resetPasswordSchema, type RegisterInput } from '@/lib/validations/auth';
import { sendPasswordResetEmail } from '@/lib/email';

type RegisterResult =
  | { success: true; userId: string }
  | { error: Record<string, string[]> };

export async function registerWithMembership(data: RegisterInput): Promise<RegisterResult> {
  const validatedFields = registerSchema.safeParse(data);

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { name, email, password } = validatedFields.data;

  try {
    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: { email: ['Email already in use'] } };
    }

    // Hash password with salt rounds of 10
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User and Membership atomically
    // Membership starts as EXPIRED — Stripe webhook will activate it after payment
    const user = await db.user.create({
      data: {
        name,
        email,
        hashedPassword,
        membership: {
          create: {
            status: 'EXPIRED',
            planName: 'Community Membership',
          },
        },
      },
    });

    return { success: true, userId: user.id };
  } catch (err) {
    console.error('Registration error:', err);
    // Handle Prisma unique constraint violation (race condition)
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      return { error: { email: ['Email already in use'] } };
    }
    return { error: { email: ['Registration failed. Please try again.'] } };
  }
}

export async function registerUser(formData: FormData) {
  const validatedFields = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { name, email, password } = validatedFields.data;

  try {
    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: { email: ['Email already in use'] } };
    }

    // Hash password with salt rounds of 10
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.user.create({
      data: {
        name,
        email,
        hashedPassword,
      },
    });

    return { success: true };
  } catch (err) {
    console.error('Registration error:', err);
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      return { error: { email: ['Email already in use'] } };
    }
    return { error: { email: ['Registration failed. Please try again.'] } };
  }
}

export async function requestPasswordReset(formData: FormData) {
  const validatedFields = forgotPasswordSchema.safeParse({
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return { error: 'Invalid email' };
  }

  const { email } = validatedFields.data;

  await sendPasswordResetEmail(email);

  // Always return success (don't reveal if email exists)
  return { success: true };
}

export async function resetPassword(formData: FormData) {
  const validatedFields = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return { error: 'Invalid input' };
  }

  const { token, password } = validatedFields.data;

  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken) {
    return { error: 'Invalid or expired reset link' };
  }

  if (resetToken.expires < new Date()) {
    await db.passwordResetToken.delete({ where: { id: resetToken.id } });
    return { error: 'Reset link has expired' };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.user.update({
    where: { email: resetToken.email },
    data: { hashedPassword },
  });

  // Delete used token
  await db.passwordResetToken.delete({ where: { id: resetToken.id } });

  return { success: true };
}
