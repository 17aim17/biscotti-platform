import Link from "next/link"

export function NoAccess({ restaurantName }: { restaurantName: string }) {
  return (
    <section className="flex flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold">You don&apos;t have access</h1>
      <p className="text-muted-foreground">
        This page is for {restaurantName} staff. If you work here, ask the owner
        to add your phone number.
      </p>
      <Link href="/account" className="text-sm underline underline-offset-4">
        Go to your account
      </Link>
    </section>
  )
}
