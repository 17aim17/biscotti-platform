import type { Metadata } from "next"
import {
  Cormorant_Garamond,
  Fraunces,
  Geist,
  Geist_Mono,
} from "next/font/google"

import "@workspace/ui/globals.css"
import { cn } from "@workspace/ui/lib/utils"

const fontSans = Geist({ subsets: ["latin"], variable: "--font-sans" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })
// Display serif for storefront headlines.
const fontDisplay = Fraunces({ subsets: ["latin"], variable: "--font-display" })
// Editorial serif used by the "classic" storefront preset.
const fontEditorial = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-editorial",
})

export const metadata: Metadata = {
  title: "Biscotti",
  description: "Online ordering for restaurants",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn(
        "font-sans antialiased",
        fontSans.variable,
        fontMono.variable,
        fontDisplay.variable,
        fontEditorial.variable
      )}
    >
      <body>{children}</body>
    </html>
  )
}
