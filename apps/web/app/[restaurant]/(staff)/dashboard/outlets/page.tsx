import { getOutletsForEditing } from "@workspace/core"
import type { Metadata } from "next"

import { NoAccess } from "@/components/no-access"
import { checkStaffAccess } from "@/lib/access"

import { PageTitle } from "../_ui"
import { OutletForm } from "./outlet-form"

export const metadata: Metadata = { title: "Outlets" }

export default async function OutletsPage({
  params,
}: PageProps<"/[restaurant]/dashboard/outlets">) {
  const { restaurant: slug } = await params
  const { restaurant, user, allowed } = await checkStaffAccess(
    slug,
    "locations:manage",
    `/${slug}/dashboard/outlets`
  )
  if (!allowed) return <NoAccess restaurantName={restaurant.name} />
  const outlets = await getOutletsForEditing(user.id, restaurant.id)

  return (
    <>
      <PageTitle title="Outlets" />
      <div className="flex flex-col gap-16">
        {outlets.map((outlet) => (
          <OutletForm key={outlet.id} slug={slug} outlet={outlet} />
        ))}
        <OutletForm
          slug={slug}
          outlet={null}
          // A new outlet starts on the first one's position, easy to move.
          start={outlets[0] ?? null}
        />
      </div>
    </>
  )
}
