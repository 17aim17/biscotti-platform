import { getMenuForEditing } from "@workspace/core"
import type { Metadata } from "next"

import { NoAccess } from "@/components/no-access"
import { checkStaffAccess } from "@/lib/access"
import { brandStyle, readBrand } from "@/lib/brand"

import { MenuEditor } from "./menu-editor"

export const metadata: Metadata = { title: "Menu" }

export default async function MenuPage({
  params,
}: PageProps<"/[restaurant]/dashboard/menu">) {
  const { restaurant: slug } = await params
  const { restaurant, user, allowed } = await checkStaffAccess(
    slug,
    "menu:manage",
    `/${slug}/dashboard/menu`
  )
  if (!allowed) return <NoAccess restaurantName={restaurant.name} />
  const categories = await getMenuForEditing(user.id, restaurant.id)

  return (
    <MenuEditor
      slug={slug}
      categories={categories}
      themeStyle={brandStyle(readBrand(restaurant.theme))}
    />
  )
}
