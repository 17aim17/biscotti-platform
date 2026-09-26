import { prisma } from "@workspace/db"
import { z } from "zod"

import { requirePermission } from "../auth/permissions"
import { MAX_PRICE_PAISE } from "../constants"
import { DomainError } from "../errors"
import { openingHoursSchema } from "../locations/hours"
import { parseInput } from "../validation"

// Outlet settings for managers and owners: address and map position,
// delivery area, hours, fees, tax, and what the outlet accepts.

export async function getOutletsForEditing(
  userId: string,
  restaurantId: string
) {
  await requirePermission(userId, restaurantId, "locations:manage")
  return prisma.location.findMany({
    where: { restaurantId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      address: true,
      lat: true,
      lng: true,
      deliveryRadiusM: true,
      hours: true,
      isOpen: true,
      deliveryFeePaise: true,
      packagingFeePaise: true,
      taxBps: true,
      acceptsCod: true,
      acceptsPickup: true,
    },
  })
}

export type EditableOutlet = Awaited<
  ReturnType<typeof getOutletsForEditing>
>[number]

const fee = z
  .number()
  .int()
  .min(0, "Fees cannot be negative.")
  .max(MAX_PRICE_PAISE, "That fee is too high.")

const outletInput = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(60),
  address: z.string().trim().min(3, "Enter the address.").max(200),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  deliveryRadiusM: z
    .number()
    .int()
    .min(100, "The delivery area must be at least 100 m.")
    .max(50_000, "The delivery area can be at most 50 km."),
  hours: openingHoursSchema,
  isOpen: z.boolean(),
  deliveryFeePaise: fee,
  packagingFeePaise: fee,
  // Basis points: 500 = 5%. Also checked by the database (0 to 100%).
  taxBps: z.number().int().min(0).max(10_000),
  acceptsCod: z.boolean(),
  acceptsPickup: z.boolean(),
})
export type OutletInput = z.infer<typeof outletInput>

export async function createOutlet(
  userId: string,
  restaurantId: string,
  raw: unknown
) {
  await requirePermission(userId, restaurantId, "locations:manage")
  const input = parseInput(outletInput, raw)
  return prisma.location.create({ data: { ...input, restaurantId } })
}

export async function updateOutlet(
  userId: string,
  restaurantId: string,
  outletId: string,
  raw: unknown
) {
  await requirePermission(userId, restaurantId, "locations:manage")
  const input = parseInput(outletInput, raw)
  const updated = await prisma.location.updateMany({
    where: { id: outletId, restaurantId },
    data: input,
  })
  if (updated.count === 0) {
    throw new DomainError("NOT_FOUND", "Outlet not found.")
  }
}
