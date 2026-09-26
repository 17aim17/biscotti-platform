import { Button } from "@workspace/ui/components/button"

export default function HomePage() {
  return (
    <main className="flex min-h-svh flex-col items-start gap-4 p-6">
      <h1 className="text-2xl font-semibold">Biscotti</h1>
      <p className="text-muted-foreground">
        Online ordering for restaurants. Storefronts live at
        /&lt;restaurant&gt;.
      </p>
      <Button>It works</Button>
    </main>
  )
}
