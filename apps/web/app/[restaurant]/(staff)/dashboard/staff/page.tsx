import { listStaff } from "@workspace/core"
import type { Metadata } from "next"

import { NoAccess } from "@/components/no-access"
import { checkStaffAccess } from "@/lib/access"

import { PageTitle } from "../_components/ui"
import { StaffManager } from "./staff-manager"

export const metadata: Metadata = { title: "Staff" }

export default async function StaffPage({
  params,
}: PageProps<"/[restaurant]/dashboard/staff">) {
  const { restaurant: slug } = await params
  const { restaurant, user, allowed } = await checkStaffAccess(
    slug,
    "staff:manage",
    `/${slug}/dashboard/staff`
  )
  if (!allowed) return <NoAccess restaurantName={restaurant.name} />
  const members = await listStaff(user.id, restaurant.id)

  return (
    <>
      <PageTitle title="Staff" />
      <StaffManager
        slug={slug}
        members={members.map((m) => ({
          id: m.id,
          role: m.role,
          isYou: m.userId === user.id,
          name: m.user.name,
          phone: m.user.phone,
        }))}
      />
    </>
  )
}
