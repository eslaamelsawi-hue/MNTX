"use client"

import dynamic from "next/dynamic"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

const ClientDashboard = dynamic(() => import("@/components/client-dashboard").then(mod => ({ default: mod.ClientDashboard })), {
  ssr: false,
  loading: () => <div className="py-20 text-center">Loading...</div>
})

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
