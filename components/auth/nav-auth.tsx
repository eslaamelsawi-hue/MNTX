"use client"

import { useEffect, useState } from "react"
import { Link, useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { LogIn, LogOut, LayoutDashboard } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export function NavAuth({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("auth")
  const router = useRouter()
  const [email, setEmail] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setEmail(session?.user?.email ?? null),
    )
    return () => sub.subscription.unsubscribe()
  }, [])

  if (email === undefined) return null // avoid flicker before we know

  if (!email) {
    return (
      <Link
        href="/login"
        onClick={onNavigate}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
      >
        <LogIn className="h-4 w-4" />
        {t("login")}
      </Link>
    )
  }

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    onNavigate?.()
    router.push("/")
    router.refresh()
  }

  return (
    <>
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
      >
        <LayoutDashboard className="h-4 w-4" />
        {t("dashboard")}
      </Link>
      <button
        type="button"
        onClick={logout}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        title={email}
      >
        <LogOut className="h-4 w-4" />
        {t("logout")}
      </button>
    </>
  )
}
