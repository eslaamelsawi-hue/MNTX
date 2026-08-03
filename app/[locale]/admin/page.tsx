"use client"

import { useState, useEffect } from "react"
import { AdminLogin } from "@/components/admin-login"
import { AdminDashboard } from "@/components/admin-dashboard"

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Check if already has admin session cookie
    const hasSession = document.cookie.includes("admin_session=")
    if (hasSession) {
      setAuthenticated(true)
    }
    setChecking(false)
  }, [])

  if (checking) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!authenticated) {
    return <AdminLogin onSuccess={() => setAuthenticated(true)} />
  }

  return <AdminDashboard />
}
