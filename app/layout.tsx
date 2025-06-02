import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Material 3 Calendar",
  description: "A beautiful calendar app with Material Design 3 and Telegram notifications",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}<Analytics /><SpeedInsights /></body>
    </html>
  )
}
