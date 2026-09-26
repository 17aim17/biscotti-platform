import { prisma } from "@workspace/db"
import { z } from "zod"

import { requirePermission } from "../auth/permissions"
import { parseInput } from "../validation"

// The storefront looks the web app offers. restaurants.theme stores one of
// these plus two colours; apps/web/lib/brand.ts turns them into styles.
export const THEME_PRESETS = ["classic", "modern", "vibrant"] as const
export type ThemePreset = (typeof THEME_PRESETS)[number]

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #8a2c12.")
const optionalUrl = z
  .url("Enter a full link (https://...).")
  .max(500)
  .nullable()
const legalText = z.string().trim().max(10_000)

const settingsInput = z.object({
  name: z.string().trim().min(1, "Enter the restaurant's name.").max(60),
  theme: z.object({
    preset: z.enum(THEME_PRESETS),
    primary: hex,
    accent: hex,
    tagline: z.string().trim().max(140).nullable(),
    heroImageUrl: optionalUrl,
    logoUrl: optionalUrl,
  }),
  legal: z.object({
    about: legalText,
    privacy: legalText,
    refund: legalText,
    terms: legalText,
  }),
  // Printed in the footer; checked for shape, not against the registries.
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^$|^[0-9A-Z]{15}$/, "A GSTIN has 15 letters and digits.")
    .transform((v) => v || null),
  fssaiLicense: z
    .string()
    .trim()
    .regex(/^$|^\d{14}$/, "An FSSAI licence number has 14 digits.")
    .transform((v) => v || null),
})
export type SettingsInput = z.input<typeof settingsInput>

export async function getSettingsForEditing(
  userId: string,
  restaurantId: string
) {
  await requirePermission(userId, restaurantId, "restaurant:manage")
  return prisma.restaurant.findUniqueOrThrow({
    where: { id: restaurantId },
    select: {
      name: true,
      slug: true,
      theme: true,
      legal: true,
      gstin: true,
      fssaiLicense: true,
    },
  })
}

export async function updateSettings(
  userId: string,
  restaurantId: string,
  raw: unknown
) {
  await requirePermission(userId, restaurantId, "restaurant:manage")
  const input = parseInput(settingsInput, raw)
  await prisma.restaurant.update({ where: { id: restaurantId }, data: input })
}
