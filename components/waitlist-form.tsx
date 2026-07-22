"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function WaitlistForm({ source = "propfirm" }: { source?: string }) {
  const t = useTranslations("waitlist")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!name.trim() || !phone.trim()) return setError(t("errorRequired"))
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(t("errorEmail"))
    setLoading(true)
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim(), source }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || t("errorGeneric"))
      else setDone(true)
    } catch {
      setError(t("errorGeneric"))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-6 text-center">
        <CheckCircle2 className="h-8 w-8 text-green-400" />
        <p className="text-lg font-semibold text-foreground">{t("successTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("successDesc")}</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3 text-start">
      <Input placeholder={t("name")} value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
      <Input type="email" placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
      <Input type="tel" placeholder={t("phone")} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("submitting")}</> : t("submit")}
      </Button>
    </form>
  )
}
