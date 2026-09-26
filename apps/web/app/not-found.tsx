import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">
        There is no restaurant or page at this address.
      </p>
      <Link href="/" className="text-sm underline underline-offset-4">
        Go to the home page
      </Link>
    </main>
  )
}
