import { z } from 'zod'

const passwordComplexity = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(200)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address').max(254, 'Email is too long'),
  password: z.string().min(1, 'Password is required').max(200, 'Password is too long'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordComplexity,
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254, 'Email is too long'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required').max(200, 'Reset token is too long'),
  newPassword: passwordComplexity,
})