import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(200),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(200),
  newPassword: z.string().min(12).max(200),
})