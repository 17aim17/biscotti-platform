import { prisma } from "@workspace/db"
import { z } from "zod"

import { requirePermission } from "../auth/permissions"
import { MAX_PRICE_PAISE } from "../constants"
import { DomainError } from "../errors"
import { parseInput } from "../validation"

// Menu editing for managers and owners. Dishes and categories are archived,
// never deleted: past orders point at them.

// The whole menu for editing, including sold-out dishes.
export async function getMenuForEditing(userId: string, restaurantId: string) {
  await requirePermission(userId, restaurantId, "menu:manage")
  return prisma.category.findMany({
    where: { restaurantId, archivedAt: null },
    orderBy: { sort: "asc" },
    select: {
      id: true,
      name: true,
      menuItems: {
        where: { archivedAt: null },
        orderBy: { title: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          pricePaise: true,
          isVeg: true,
          isAvailable: true,
          isFeatured: true,
          imageUrl: true,
          categoryId: true,
        },
      },
    },
  })
}

export type EditableCategory = Awaited<
  ReturnType<typeof getMenuForEditing>
>[number]
export type EditableDish = EditableCategory["menuItems"][number]

const categoryName = z.string().trim().min(1, "Enter a name.").max(60)

export async function createCategory(
  userId: string,
  restaurantId: string,
  rawName: unknown
) {
  await requirePermission(userId, restaurantId, "menu:manage")
  const name = parseInput(categoryName, rawName)
  const last = await prisma.category.aggregate({
    where: { restaurantId },
    _max: { sort: true },
  })
  return prisma.category.create({
    data: { restaurantId, name, sort: (last._max.sort ?? -1) + 1 },
  })
}

export async function renameCategory(
  userId: string,
  restaurantId: string,
  categoryId: string,
  rawName: unknown
) {
  await requirePermission(userId, restaurantId, "menu:manage")
  const name = parseInput(categoryName, rawName)
  await ownCategory(restaurantId, categoryId)
  await prisma.category.update({ where: { id: categoryId }, data: { name } })
}

// Swap places with the neighbour above or below.
export async function moveCategory(
  userId: string,
  restaurantId: string,
  categoryId: string,
  direction: "up" | "down"
) {
  await requirePermission(userId, restaurantId, "menu:manage")
  const categories = await prisma.category.findMany({
    where: { restaurantId, archivedAt: null },
    orderBy: { sort: "asc" },
    select: { id: true },
  })
  const index = categories.findIndex((c) => c.id === categoryId)
  if (index === -1) throw new DomainError("NOT_FOUND", "Category not found.")
  const target = direction === "up" ? index - 1 : index + 1
  if (target < 0 || target >= categories.length) return
  const reordered = [...categories]
  ;[reordered[index], reordered[target]] = [
    reordered[target]!,
    reordered[index]!,
  ]
  // Renumber everything, so gaps or duplicate sort values fix themselves.
  await prisma.$transaction(
    reordered.map((c, sort) =>
      prisma.category.update({ where: { id: c.id }, data: { sort } })
    )
  )
}

// Only empty categories can go: moving or archiving the dishes first makes
// it a deliberate choice.
export async function archiveCategory(
  userId: string,
  restaurantId: string,
  categoryId: string
) {
  await requirePermission(userId, restaurantId, "menu:manage")
  await ownCategory(restaurantId, categoryId)
  const dishes = await prisma.menuItem.count({
    where: { categoryId, archivedAt: null },
  })
  if (dishes > 0) {
    throw new DomainError(
      "INVALID_INPUT",
      "Move or remove the dishes in this category first."
    )
  }
  await prisma.category.update({
    where: { id: categoryId },
    data: { archivedAt: new Date() },
  })
}

const dishInput = z.object({
  categoryId: z.uuid(),
  title: z.string().trim().min(1, "Enter a name.").max(80),
  description: z.string().trim().max(400),
  pricePaise: z
    .number()
    .int()
    .min(0, "The price cannot be negative.")
    .max(MAX_PRICE_PAISE, "That price is too high."),
  isVeg: z.boolean(),
  isFeatured: z.boolean(),
  imageUrl: z.url().max(500).nullable(),
})
export type DishInput = z.infer<typeof dishInput>

export async function createDish(
  userId: string,
  restaurantId: string,
  raw: unknown
) {
  await requirePermission(userId, restaurantId, "menu:manage")
  const input = parseInput(dishInput, raw)
  await ownCategory(restaurantId, input.categoryId)
  return prisma.menuItem.create({ data: { ...input, restaurantId } })
}

export async function updateDish(
  userId: string,
  restaurantId: string,
  dishId: string,
  raw: unknown
) {
  await requirePermission(userId, restaurantId, "menu:manage")
  const input = parseInput(dishInput, raw)
  await ownDish(restaurantId, dishId)
  await ownCategory(restaurantId, input.categoryId)
  // Past orders keep their own copy of title and price, so editing is safe.
  await prisma.menuItem.update({ where: { id: dishId }, data: input })
}

// The quick "sold out today" switch.
export async function setDishAvailable(
  userId: string,
  restaurantId: string,
  dishId: string,
  isAvailable: boolean
) {
  await requirePermission(userId, restaurantId, "menu:manage")
  await ownDish(restaurantId, dishId)
  await prisma.menuItem.update({
    where: { id: dishId },
    data: { isAvailable },
  })
}

export async function archiveDish(
  userId: string,
  restaurantId: string,
  dishId: string
) {
  await requirePermission(userId, restaurantId, "menu:manage")
  await ownDish(restaurantId, dishId)
  await prisma.menuItem.update({
    where: { id: dishId },
    data: { archivedAt: new Date() },
  })
}

// Ids come from the browser: make sure they belong to this restaurant.
async function ownCategory(restaurantId: string, categoryId: string) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, restaurantId, archivedAt: null },
    select: { id: true },
  })
  if (!category) throw new DomainError("NOT_FOUND", "Category not found.")
}

async function ownDish(restaurantId: string, dishId: string) {
  const dish = await prisma.menuItem.findFirst({
    where: { id: dishId, restaurantId, archivedAt: null },
    select: { id: true },
  })
  if (!dish) throw new DomainError("NOT_FOUND", "Dish not found.")
}
