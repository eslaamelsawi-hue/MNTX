"use client"

import dynamic from "next/dynamic"

const DashboardPage = dynamic(() => import("@/components/client-dashboard").then(mod => ({ default: mod.ClientDashboard })), {
  ssr: false,
})

export default function RootPage() {
  return (
    <main>
      <DashboardPage />
    </main>
  )
}
