"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, TrendingUp, Mail } from "lucide-react"

export function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("")
  const [mentorEmail, setMentorEmail] = useState("")
  const [mentorPassword, setMentorPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [loginType, setLoginType] = useState<"admin" | "mentor">("admin")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          loginType === "admin"
            ? { password }
            : { mentorEmail, mentorPassword }
        ),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.type === "mentor") {
          localStorage.setItem("login_type", "mentor")
          localStorage.setItem("mentor_id", data.mentorId)
          localStorage.setItem("mentor_name", data.mentorName)
          localStorage.setItem("mentor_email", data.mentorEmail)
        } else {
          localStorage.setItem("login_type", "admin")
        }
        onSuccess()
      } else {
        const data = await res.json()
        setError(data.error || (loginType === "admin" ? "Invalid password" : "Mentor not found"))
      }
    } catch {
      setError("Something went wrong. Please try again.")
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <TrendingUp className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Dashboard Login</CardTitle>
          <CardDescription>
            {loginType === "admin" ? "Admin password" : "Mentor email"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Login Type Toggle */}
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={loginType === "admin" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => {
                  setLoginType("admin")
                  setError("")
                }}
              >
                Admin
              </Button>
              <Button
                type="button"
                variant={loginType === "mentor" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => {
                  setLoginType("mentor")
                  setError("")
                }}
              >
                Mentor
              </Button>
            </div>

            {loginType === "admin" ? (
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5" /> Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your mentor email"
                    value={mentorEmail}
                    onChange={(e) => setMentorEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mentor-password" className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" /> Password
                  </Label>
                  <Input
                    id="mentor-password"
                    type="password"
                    placeholder="Enter your mentor password"
                    value={mentorPassword}
                    onChange={(e) => setMentorPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
