"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { User, Lock, Loader2, Check, ShieldCheck, Mail, Camera, Bell, LogOut } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase/client"

export function DashboardSettings() {
  const t = useTranslations("settings")
  const locale = useLocale()
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  // Password change (OTP-gated)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState("")
  const [pwDone, setPwDone] = useState(false)

  // Notification preference
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [notifLoading, setNotifLoading] = useState(true)
  const [notifSaved, setNotifSaved] = useState(false)

  // Sign out
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    fetch("/api/preferences")
      .then((r) => (r.ok ? r.json() : { email_notifications: true }))
      .then((d) => setEmailNotifications(d.email_notifications ?? true))
      .catch(() => {})
      .finally(() => setNotifLoading(false))
  }, [])

  const toggleEmailNotifications = async (checked: boolean) => {
    setEmailNotifications(checked)
    setNotifSaved(false)
    try {
      await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_notifications: checked }),
      })
      setNotifSaved(true)
      setTimeout(() => setNotifSaved(false), 2000)
    } catch {
      setEmailNotifications(!checked)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    await createClient().auth.signOut()
    router.push(`/${locale}/login`)
  }

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        const u = data.user
        if (!u) return
        setEmail(u.email ?? "")
        setName((u.user_metadata?.first_name || u.user_metadata?.full_name || "") as string)
        setPhone((u.user_metadata?.phone || "") as string)
        setAvatarUrl((u.user_metadata?.avatar_url || "") as string)
      })
  }, [])

  const uploadPhoto = async (file: File) => {
    setUploadingPhoto(true)
    setProfileMsg("")
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/account/avatar", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) {
        setProfileMsg(data.error || t("errPhoto"))
      } else {
        setAvatarUrl(data.url)
        // refresh the client session so the new avatar propagates
        await createClient().auth.refreshSession()
      }
    } catch {
      setProfileMsg(t("errPhoto"))
    } finally {
      setUploadingPhoto(false)
    }
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    setProfileMsg("")
    const { error } = await createClient().auth.updateUser({
      data: { first_name: name.trim(), full_name: name.trim(), phone: phone.trim() },
    })
    setSavingProfile(false)
    setProfileMsg(error ? error.message : t("saved"))
    setTimeout(() => setProfileMsg(""), 2500)
  }

  // Step 1 — validate & email a re-authentication OTP.
  const sendCode = async () => {
    setPwError("")
    if (newPassword.length < 6) return setPwError(t("errShort"))
    if (newPassword !== confirmPassword) return setPwError(t("errMatch"))
    setPwLoading(true)
    const { error } = await createClient().auth.reauthenticate()
    setPwLoading(false)
    if (error) return setPwError(error.message)
    setOtpSent(true)
  }

  // Step 2 — verify the OTP (nonce) and set the new password.
  const changePassword = async () => {
    setPwError("")
    if (!otp.trim()) return setPwError(t("errOtp"))
    setPwLoading(true)
    const { error } = await createClient().auth.updateUser({ password: newPassword, nonce: otp.trim() })
    setPwLoading(false)
    if (error) {
      return setPwError(/nonce|otp|invalid|expired|token/i.test(error.message) ? t("errOtp") : error.message)
    }
    setPwDone(true)
    setOtpSent(false)
    setNewPassword("")
    setConfirmPassword("")
    setOtp("")
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" /> {t("profileTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("profileDesc")}</p>

          {/* Photo */}
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-1 ring-border" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-7 w-7" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-foreground">{t("photo")}</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-1.5 gap-1.5"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {avatarUrl ? t("changePhoto") : t("uploadPhoto")}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="set-name">{t("name")}</Label>
            <Input id="set-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-phone">{t("phone")}</Label>
            <Input id="set-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={saveProfile} disabled={savingProfile} className="gap-2">
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {t("save")}
            </Button>
            {profileMsg && <span className="text-sm text-green-400">{profileMsg}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-primary" /> {t("passwordTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pwDone ? (
            <div className="flex items-center gap-2.5 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
              <Check className="h-4 w-4 shrink-0" /> {t("passwordChanged")}
            </div>
          ) : (
            <>
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {t("passwordDesc")}
              </p>

              {!otpSent ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="set-newpw">{t("newPassword")}</Label>
                    <Input id="set-newpw" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="set-confirmpw">{t("confirmPassword")}</Label>
                    <Input id="set-confirmpw" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <Button onClick={sendCode} disabled={pwLoading} className="gap-2">
                    {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    {pwLoading ? t("sending") : t("sendCode")}
                  </Button>
                </>
              ) : (
                <>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                    {t("codeSent", { email })}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="set-otp">{t("otp")}</Label>
                    <Input
                      id="set-otp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="max-w-[200px] tracking-[0.3em]"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={changePassword} disabled={pwLoading} className="gap-2">
                      {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                      {pwLoading ? t("processing") : t("changePassword")}
                    </Button>
                    <Button variant="ghost" onClick={sendCode} disabled={pwLoading} className="text-muted-foreground">
                      {t("resend")}
                    </Button>
                    <Button variant="ghost" onClick={() => { setOtpSent(false); setOtp(""); setPwError("") }} className="text-muted-foreground">
                      {t("cancel")}
                    </Button>
                  </div>
                </>
              )}

              {pwError && <p className="text-sm text-destructive">{pwError}</p>}
            </>
          )}
        </CardContent>
      </Card>

      {/* Notification preferences */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" /> {t("notifTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("notifDesc")}</p>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="email-notifications" className="cursor-pointer">{t("emailNotifications")}</Label>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              disabled={notifLoading}
              onCheckedChange={toggleEmailNotifications}
            />
          </div>
          {notifSaved && <p className="text-sm text-green-400">{t("notifSaved")}</p>}
        </CardContent>
      </Card>

      {/* Account */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LogOut className="h-4 w-4 text-primary" /> {t("accountTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("accountDesc")}</p>
          <Button variant="outline" onClick={handleSignOut} disabled={signingOut} className="gap-2">
            {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            {signingOut ? t("signingOut") : t("signOut")}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
