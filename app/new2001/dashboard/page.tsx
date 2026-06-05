"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ClientDashboard } from "@/components/client-dashboard"

export const dynamic = "force-dynamic"

export default function DashboardPage() {
  return (
    <main>
      <Navbar />
      <ClientDashboard />
      <Footer />
    </main>
  )
}
