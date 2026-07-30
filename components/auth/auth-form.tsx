"use client"

import { useState } from "react"
import { useRouter } from "@/i18n/navigation"
import { Link } from "@/i18n/navigation"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Loader2, Mail, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const t = useTranslations("auth")
  const router = useRouter()
  const params = useSearchParams()
  const redirectTo = params.get("redirect") || "/dashboard"

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [confirmSent, setConfirmSent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (mode === "register") {
      if (!name.trim()) return setError(t("errorFirstName"))
      if (!phone.trim()) return setError(t("errorPhone"))
    }
    if (!email.includes("@")) return setError(t("errorInvalid"))
    if (password.length < 6) return setError(t("errorWeak"))
    if (mode === "register") {
      if (password !== confirmPassword) return setError(t("errorConfirm"))
      if (!agreed) return setError(t("errorAgree"))
    }

    setLoading(true)
    const supabase = createClient()
    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name, first_name: name, phone },
            emailRedirectTo: `${window.location.origin}${redirectTo}`,
          },
        })
        if (error) {
          setError(/already/i.test(error.message) ? t("errorExists") : error.message)
          return
        }
        // Email confirmation ON -> no session yet; OFF -> logged in immediately.
        if (data.session) {
          router.push(redirectTo)
          router.refresh()
        } else {
          setConfirmSent(true)
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          if (/confirm/i.test(error.message)) setError(t("errorNotConfirmed"))
          else if (/invalid/i.test(error.message)) setError(t("errorInvalid"))
          else setError(error.message)
          return
        }
        router.push(redirectTo)
        router.refresh()
      }
    } catch {
      setError(t("errorGeneric"))
    } finally {
      setLoading(false)
    }
  }

  if (confirmSent) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t("checkEmailTitle")}</h1>
        <p className="mx-auto mt-3 max-w-sm text-muted-foreground">{t("checkEmailDesc", { email })}</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/login">{t("signInLink")}</Link>
        </Button>
      </div>
    )
  }

  const isRegister = mode === "register"

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <GraduationCap className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {isRegister ? t("registerTitle") : t("loginTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isRegister ? t("registerSubtitle") : t("loginSubtitle")}
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <form onSubmit={submit} className="space-y-4">
            {isRegister && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="auth-name">{t("firstName")}</Label>
                  <Input
                    id="auth-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("firstName")}
                    autoComplete="given-name"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="auth-phone">{t("phone")}</Label>
                  <Input
                    id="auth-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("phonePlaceholder")}
                    autoComplete="tel"
                    disabled={loading}
                  />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="auth-email">{t("email")}</Label>
              <Input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="auth-password">{t("password")}</Label>
                {!isRegister && (
                  <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                    {t("forgotPassword")}
                  </Link>
                )}
              </div>
              <Input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isRegister ? "new-password" : "current-password"}
                disabled={loading}
              />
            </div>
            {isRegister && (
              <div className="space-y-1.5">
                <Label htmlFor="auth-confirm">{t("confirmPassword")}</Label>
                <Input
                  id="auth-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
            )}
            {isRegister && (
              <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                  disabled={loading}
                />
                <span>
                  {t("agreePrefix")}
                  <Link href="/terms" target="_blank" className="text-primary underline hover:no-underline">
                    {t("termsLink")}
                  </Link>
                  {t("agreeAnd")}
                  <Link href="/community" target="_blank" className="text-primary underline hover:no-underline">
                    {t("communityLink")}
                  </Link>
                </span>
              </label>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? t("processing") : isRegister ? t("registerCta") : t("loginCta")}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {isRegister ? t("haveAccount") : t("noAccount")}{" "}
            <Link
              href={isRegister ? "/login" : "/register"}
              className="font-medium text-primary hover:underline"
            >
              {isRegister ? t("signInLink") : t("signUpLink")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
