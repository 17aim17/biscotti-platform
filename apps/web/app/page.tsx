import Link from "next/link"

// Landing page. Each restaurant's storefront lives at /<slug>.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Biscotti</h1>
        <p className="mt-2 text-muted-foreground">
          Online ordering for restaurants: a storefront, a kitchen screen and a
          dashboard.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Demo restaurants</p>
        <Link href="/casa-spezia" className="underline underline-offset-4">
          Casa Spezia
        </Link>
        <Link href="/osteria-sole" className="underline underline-offset-4">
          Osteria Sole
        </Link>
      </div>
      <Link
        href="/account"
        className="text-sm text-muted-foreground underline underline-offset-4"
      >
        Staff sign in
      </Link>
    </main>
  )
}
