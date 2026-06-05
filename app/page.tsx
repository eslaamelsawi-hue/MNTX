"use client"

import { ClientDashboard } from "@/components/client-dashboard"

export default function RootPage() {
  return (
    <>
      <div style={{ position: "fixed", top: 0, right: 0, background: "red", color: "white", padding: "10px", zIndex: 9999 }}>
        ROOT PAGE LOADED
      </div>
      <ClientDashboard />
    </>
  )
}
