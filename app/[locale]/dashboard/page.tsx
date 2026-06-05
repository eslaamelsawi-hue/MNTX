"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ClientDashboard } from "@/components/client-dashboard-v2"

export default function DashboardPage() {
  return (
    <main>
      <Navbar />
      <ClientDashboard />
      <Footer />
    </main>
  )
}
