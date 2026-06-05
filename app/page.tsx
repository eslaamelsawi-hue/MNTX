"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

const ClientDashboard = dynamic(() => import("@/components/client-dashboard").then(mod => ({ default: mod.ClientDashboard })), {
  ssr: false,
  loading: () => <div className="py-20 text-center text-gray-400">Loading...</div>
})

export default function DashboardPage() {
  return (
    <main>
      <Navbar />
      <Suspense fallback={<div className="py-20 text-center text-gray-400">Loading...</div>}>
        <ClientDashboard />
      </Suspense>
      <Footer />
    </main>
  )
}
