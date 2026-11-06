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
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordComplexity,
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(200),
  newPassword: passwordComplexity,
})