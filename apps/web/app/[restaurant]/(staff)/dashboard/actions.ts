"use server"

import {
  addStaffMember,
  archiveCategory,
  archiveDish,
  changeStaffRole,
  createCategory,
  createDish,
  createOutlet,
  DomainError,
  findUserIdByPhone,
  markPaymentRefunded,
  moveCategory,
  parseInput,
  removeStaffMember,
  renameCategory,
  requirePermission,
  setDishAvailable,
  staffPhone,
  updateDish,
  updateOutlet,
  updateSettings,
} from "@workspace/core"
import { z } from "zod"

import { staffAction } from "@/lib/staff-action"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

// Dashboard Server Actions. Each one is thin: the core function it calls
// checks the permission and validates the input.

const id = z.uuid("Invalid id.")

// Orders

export async function markRefundedAction(slug: string, paymentId: unknown) {
  return staffAction(slug, ({ userId, restaurantId }) =>
    markPaymentRefunded(userId, restaurantId, parseInput(id, paymentId))
  )
}

// Menu

export async function createCategoryAction(slug: string, name: unknown) {
  return staffAction(slug, async ({ userId, restaurantId }) => {
    await createCategory(userId, restaurantId, name)
    return null
  })
}

export async function renameCategoryAction(
  slug: string,
  categoryId: unknown,
  name: unknown
) {
  return staffAction(slug, ({ userId, restaurantId }) =>
    renameCategory(userId, restaurantId, parseInput(id, categoryId), name)
  )
}

export async function moveCategoryAction(
  slug: string,
  categoryId: unknown,
  direction: unknown
) {
  return staffAction(slug, ({ userId, restaurantId }) =>
    moveCategory(
      userId,
      restaurantId,
      parseInput(id, categoryId),
      parseInput(z.enum(["up", "down"]), direction)
    )
  )
}

export async function archiveCategoryAction(slug: string, categoryId: unknown) {
  return staffAction(slug, ({ userId, restaurantId }) =>
    archiveCategory(userId, restaurantId, parseInput(id, categoryId))
  )
}

export async function saveDishAction(
  slug: string,
  dishId: unknown,
  input: unknown
) {
  return staffAction(slug, async ({ userId, restaurantId }) => {
    if (dishId === null) await createDish(userId, restaurantId, input)
    else await updateDish(userId, restaurantId, parseInput(id, dishId), input)
    return null
  })
}

export async function setDishAvailableAction(
  slug: string,
  dishId: unknown,
  available: unknown
) {
  return staffAction(slug, ({ userId, restaurantId }) =>
    setDishAvailable(
      userId,
      restaurantId,
      parseInput(id, dishId),
      parseInput(z.boolean(), available)
    )
  )
}

export async function archiveDishAction(slug: string, dishId: unknown) {
  return staffAction(slug, ({ userId, restaurantId }) =>
    archiveDish(userId, restaurantId, parseInput(id, dishId))
  )
}

// Photos (dishes, hero image, logo)

// Same limits as the menu-images bucket in supabase/config.toml.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

// The file's real type from its first bytes. The type the browser reports is
// only a claim, so it is not trusted.
function imageType(bytes: Uint8Array) {
  const at = (offset: number, ...values: number[]) =>
    values.every((v, i) => bytes[offset + i] === v)
  if (at(0, 0xff, 0xd8, 0xff)) return { ext: "jpg", type: "image/jpeg" }
  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return { ext: "png", type: "image/png" }
  // "RIFF" .... "WEBP"
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50))
    return { ext: "webp", type: "image/webp" }
  return null
}

// Stores the photo under the restaurant's own folder and returns its public
// URL. The browser never writes to Storage directly: uploads go through here,
// after the permission check.
export async function uploadImageAction(slug: string, form: FormData) {
  return staffAction(slug, async ({ userId, restaurantId }) => {
    // Menu managers upload dish photos; the owner uploads the hero and logo.
    await requirePermission(userId, restaurantId, "menu:manage")
    const file = form.get("file")
    if (!(file instanceof File)) {
      throw new DomainError("INVALID_INPUT", "Choose a photo.")
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new DomainError("INVALID_INPUT", "Photos can be up to 2 MB.")
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    const image = imageType(bytes)
    if (!image) {
      throw new DomainError("INVALID_INPUT", "Use a JPEG, PNG or WebP photo.")
    }
    const path = `${restaurantId}/${crypto.randomUUID()}.${image.ext}`
    const storage = createSupabaseAdminClient().storage.from("menu-images")
    const { error } = await storage.upload(path, bytes, {
      contentType: image.type,
      cacheControl: "31536000",
    })
    if (error) throw new Error(`Upload failed: ${error.message}`)
    return storage.getPublicUrl(path).data.publicUrl
  })
}

// Outlets

export async function saveOutletAction(
  slug: string,
  outletId: unknown,
  input: unknown
) {
  return staffAction(slug, async ({ userId, restaurantId }) => {
    if (outletId === null) await createOutlet(userId, restaurantId, input)
    else
      await updateOutlet(userId, restaurantId, parseInput(id, outletId), input)
    return null
  })
}

// Staff

// Adds someone by phone. If they have never signed in, a login is created for
// that number now (no SMS is sent); they sign in later with the usual code.
export async function addStaffAction(
  slug: string,
  phone: unknown,
  role: unknown
) {
  return staffAction(slug, async ({ userId, restaurantId }) => {
    await requirePermission(userId, restaurantId, "staff:manage")
    const digits = parseInput(staffPhone, phone)
    let memberId = await findUserIdByPhone(digits)
    if (!memberId) {
      const { data, error } =
        await createSupabaseAdminClient().auth.admin.createUser({
          phone: `+${digits}`,
          phone_confirm: true,
        })
      if (error || !data.user) {
        throw new Error(`Could not create the login: ${error?.message}`)
      }
      // The profile row comes from the signup trigger in the database.
      memberId = data.user.id
    }
    await addStaffMember(userId, restaurantId, memberId, role)
    return null
  })
}

export async function changeRoleAction(
  slug: string,
  membershipId: unknown,
  role: unknown
) {
  return staffAction(slug, ({ userId, restaurantId }) =>
    changeStaffRole(userId, restaurantId, parseInput(id, membershipId), role)
  )
}

export async function removeStaffAction(slug: string, membershipId: unknown) {
  return staffAction(slug, ({ userId, restaurantId }) =>
    removeStaffMember(userId, restaurantId, parseInput(id, membershipId))
  )
}

// Settings

export async function saveSettingsAction(slug: string, input: unknown) {
  return staffAction(slug, ({ userId, restaurantId }) =>
    updateSettings(userId, restaurantId, input)
  )
}
