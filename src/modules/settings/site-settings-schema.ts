import { z } from 'zod'

export const socialLinksSchema = z.object({
  linkedin: z.string().url().optional().or(z.literal('')),
  twitter: z.string().url().optional().or(z.literal('')),
  youtube: z.string().url().optional().or(z.literal('')),
  instagram: z.string().url().optional().or(z.literal('')),
})

export const contactSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
})

export const legalSchema = z.object({
  companyName: z.string().optional().or(z.literal('')),
  registrationNumber: z.string().optional().or(z.literal('')),
  vatNumber: z.string().optional().or(z.literal('')),
  privacyPolicyUrl: z.string().url().optional().or(z.literal('')),
  termsOfServiceUrl: z.string().url().optional().or(z.literal('')),
})

export const seoSchema = z.object({
  defaultTitle: z.string().optional().or(z.literal('')),
  defaultDescription: z.string().optional().or(z.literal('')),
  defaultImage: z.string().url().optional().or(z.literal('')),
  twitterHandle: z.string().optional().or(z.literal('')),
})

export const heroSchema = z.object({
  headline: z.string().optional().or(z.literal('')),
  subheadline: z.string().optional().or(z.literal('')),
  ctaText: z.string().optional().or(z.literal('')),
  ctaUrl: z.string().optional().or(z.literal('')),
  backgroundImage: z.string().url().optional().or(z.literal('')),
})

export const announcementSchema = z.object({
  enabled: z.boolean(),
  message: z.string().optional().or(z.literal('')),
  messageAr: z.string().optional().or(z.literal('')),
  linkText: z.string().optional().or(z.literal('')),
  linkUrl: z.string().url().optional().or(z.literal('')),
  type: z.enum(['info', 'warning', 'success']).optional(),
})

export const siteSettingsSchema = z.object({
  contact: contactSchema.optional(),
  legal: legalSchema.optional(),
  social: socialLinksSchema.optional(),
  seo: seoSchema.optional(),
  hero: heroSchema.optional(),
  announcement: announcementSchema.optional(),
  navigation: z.array(z.object({
    label: z.string(),
    url: z.string(),
    order: z.number(),
  })).optional(),
}).strict()

export type SiteSettings = z.infer<typeof siteSettingsSchema>

export const siteSettingsDefaults: SiteSettings = {
  contact: { email: '', phone: '', address: '' },
  legal: { companyName: '', registrationNumber: '', vatNumber: '', privacyPolicyUrl: '', termsOfServiceUrl: '' },
  social: { linkedin: '', twitter: '', youtube: '', instagram: '' },
  seo: { defaultTitle: '', defaultDescription: '', defaultImage: '', twitterHandle: '' },
  hero: { headline: '', subheadline: '', ctaText: '', ctaUrl: '', backgroundImage: '' },
  announcement: { enabled: false, message: '', messageAr: '', linkText: '', linkUrl: '', type: 'info' },
  navigation: [],
}

export function mergeWithDefaults(data: Partial<SiteSettings>): SiteSettings {
  return siteSettingsSchema.parse({
    ...siteSettingsDefaults,
    ...data,
    contact: { ...siteSettingsDefaults.contact, ...data.contact },
    legal: { ...siteSettingsDefaults.legal, ...data.legal },
    social: { ...siteSettingsDefaults.social, ...data.social },
    seo: { ...siteSettingsDefaults.seo, ...data.seo },
    hero: { ...siteSettingsDefaults.hero, ...data.hero },
    announcement: { ...siteSettingsDefaults.announcement, ...data.announcement },
  })
}