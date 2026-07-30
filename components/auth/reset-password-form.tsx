"use client"

import { useEffect, useState } from "react"
import { Link, useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

export function ResetPasswordForm() {
  const t = useTranslations("auth")
  const router = useRouter()

  const [ready, setReady] = useState<boolean | null>(null)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true)
    })
    // The recovery link may have already been processed before this listener
    // was attached, so also check for an existing session directly.
    supabase.auth.getSession().then(({ data }) => {
      setReady((prev) => prev ?? !!data.session)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password.length < 6) return setError(t("errorWeak"))
    if (password !== confirmPassword) return setError(t("errorConfirm"))

    setLoading(true)
    const { error } = await createClient().auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
    setTimeout(() => router.push("/login"), 2500)
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t("resetSuccessTitle")}</h1>
        <p className="mx-auto mt-3 max-w-sm text-muted-foreground">{t("resetSuccessDesc")}</p>
      </div>
    )
  }

  if (ready === null) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground">{t("resetInvalidTitle")}</h1>
        <p className="mx-auto mt-3 max-w-sm text-muted-foreground">{t("resetInvalidDesc")}</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/forgot-password">{t("forgotTitle")}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("resetTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("resetSubtitle")}</p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reset-password">{t("newPassword")}</Label>
              <Input
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reset-confirm">{t("confirmPassword")}</Label>
              <Input
                id="reset-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? t("processing") : t("resetCta")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
