import { getSettingsForEditing, THEME_PRESETS } from "@workspace/core"
import type { Metadata } from "next"
import Link from "next/link"

import { NoAccess } from "@/components/no-access"
import { eyebrow } from "@/components/styles"
import { checkStaffAccess } from "@/lib/access"
import { readBrand } from "@/lib/brand"

import { PageTitle } from "../_ui"
import { SettingsForm } from "./settings-form"

export const metadata: Metadata = { title: "Settings" }

export default async function SettingsPage({
  params,
}: PageProps<"/[restaurant]/dashboard/settings">) {
  const { restaurant: slug } = await params
  const { restaurant, user, allowed } = await checkStaffAccess(
    slug,
    "restaurant:manage",
    `/${slug}/dashboard/settings`
  )
  if (!allowed) return <NoAccess restaurantName={restaurant.name} />
  const settings = await getSettingsForEditing(user.id, restaurant.id)
  const legal = (settings.legal ?? {}) as Record<string, unknown>
  const text = (key: string) =>
    typeof legal[key] === "string" ? (legal[key] as string) : ""

  return (
    <>
      <PageTitle title="Settings">
        <Link
          href={`/${slug}`}
          target="_blank"
          className={`${eyebrow} text-(--sf-muted) underline-offset-4 hover:text-(--sf-ink) hover:underline`}
        >
          Open the storefront
        </Link>
      </PageTitle>
      <SettingsForm
        slug={slug}
        presets={[...THEME_PRESETS]}
        initial={{
          name: settings.name,
          theme: readBrand(settings.theme),
          legal: {
            about: text("about"),
            privacy: text("privacy"),
            refund: text("refund"),
            terms: text("terms"),
          },
          gstin: settings.gstin ?? "",
          fssaiLicense: settings.fssaiLicense ?? "",
        }}
      />
    </>
  )
}
