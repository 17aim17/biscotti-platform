import { MembershipRole, prisma } from "@workspace/db"
import { z } from "zod"

import { requirePermission } from "../auth/permissions"
import { DomainError } from "../errors"
import { parseInput } from "../validation"

// Staff management, owners only. A restaurant always keeps at least one owner,
// so nobody can lock everyone out of the dashboard.

export async function listStaff(userId: string, restaurantId: string) {
  await requirePermission(userId, restaurantId, "staff:manage")
  return prisma.membership.findMany({
    where: { restaurantId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      role: true,
      userId: true,
      user: { select: { name: true, phone: true } },
    },
  })
}

// Phone numbers as Supabase Auth stores them: country code and digits, no
// "+" (919876543210). A 10-digit number is taken as Indian.
export const staffPhone = z
  .string()
  .transform((v) => v.replace(/[^\d]/g, ""))
  .transform((d) => (d.length === 10 ? `91${d}` : d))
  .refine((d) => /^\d{11,15}$/.test(d), "Enter a 10-digit mobile number.")

export async function findUserIdByPhone(phone: string) {
  const profile = await prisma.profile.findFirst({
    where: { phone },
    select: { id: true },
  })
  return profile?.id ?? null
}

const role = z.enum(MembershipRole)

export async function addStaffMember(
  actorId: string,
  restaurantId: string,
  memberUserId: string,
  rawRole: unknown
) {
  await requirePermission(actorId, restaurantId, "staff:manage")
  const newRole = parseInput(role, rawRole)
  const existing = await prisma.membership.findUnique({
    where: { userId_restaurantId: { userId: memberUserId, restaurantId } },
  })
  if (existing) {
    throw new DomainError(
      "INVALID_INPUT",
      "This person is already on the team."
    )
  }
  await prisma.membership.create({
    data: { userId: memberUserId, restaurantId, role: newRole },
  })
}

export async function changeStaffRole(
  actorId: string,
  restaurantId: string,
  membershipId: string,
  rawRole: unknown
) {
  await requirePermission(actorId, restaurantId, "staff:manage")
  const newRole = parseInput(role, rawRole)
  await prisma.$transaction(async (tx) => {
    const member = await tx.membership.findFirst({
      where: { id: membershipId, restaurantId },
    })
    if (!member) throw new DomainError("NOT_FOUND", "Team member not found.")
    if (
      member.role === MembershipRole.owner &&
      newRole !== MembershipRole.owner
    ) {
      await ensureAnotherOwner(tx, restaurantId, membershipId)
    }
    await tx.membership.update({
      where: { id: membershipId },
      data: { role: newRole },
    })
  })
}

export async function removeStaffMember(
  actorId: string,
  restaurantId: string,
  membershipId: string
) {
  await requirePermission(actorId, restaurantId, "staff:manage")
  await prisma.$transaction(async (tx) => {
    const member = await tx.membership.findFirst({
      where: { id: membershipId, restaurantId },
    })
    if (!member) throw new DomainError("NOT_FOUND", "Team member not found.")
    if (member.role === MembershipRole.owner) {
      await ensureAnotherOwner(tx, restaurantId, membershipId)
    }
    await tx.membership.delete({ where: { id: membershipId } })
  })
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

async function ensureAnotherOwner(
  tx: Tx,
  restaurantId: string,
  membershipId: string
) {
  const others = await tx.membership.count({
    where: {
      restaurantId,
      role: MembershipRole.owner,
      id: { not: membershipId },
    },
  })
  if (others === 0) {
    throw new DomainError(
      "INVALID_INPUT",
      "A restaurant needs at least one owner. Add another owner first."
    )
  }
}
