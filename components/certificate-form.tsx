"use client"

import React, { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Loader2, Award } from "lucide-react"
import { useTranslations } from "next-intl"

export function CertificateForm() {
  const t = useTranslations("certificateForm")
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    courseName: "",
    completionDate: "",
    notes: "",
  })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("loading")
    setErrorMsg("")

    try {
      const res = await fetch("/api/certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Something went wrong")
      }

      setStatus("success")
      setForm({ fullName: "", email: "", courseName: "", completionDate: "", notes: "" })
    } catch (err: unknown) {
      setStatus("error")
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  return (
    <section className="min-h-screen flex items-center justify-center px-4 py-20">
      <Card className="w-full max-w-lg border-amber-500/20 bg-black/40 backdrop-blur-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-4">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">{t("badge")}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {t("title")} <span className="text-amber-400">{t("titleHighlight")}</span>
            </h1>
            <p className="text-gray-400 text-sm">{t("description")}</p>
          </div>

          {status === "success" ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">{t("successTitle")}</h2>
              <p className="text-gray-400 mb-6">{t("successMessage")}</p>
              <Button
                onClick={() => setStatus("idle")}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                {t("submitAnother")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm text-gray-300 mb-1.5 block">{t("fullName")}</label>
                <Input
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  required
                  placeholder={t("fullNamePlaceholder")}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-1.5 block">{t("email")}</label>
                <Input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder={t("emailPlaceholder")}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-1.5 block">{t("courseName")}</label>
                <Input
                  name="courseName"
                  value={form.courseName}
                  onChange={handleChange}
                  required
                  placeholder={t("courseNamePlaceholder")}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-1.5 block">{t("completionDate")}</label>
                <Input
                  name="completionDate"
                  type="date"
                  value={form.completionDate}
                  onChange={handleChange}
                  required
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-1.5 block">{t("notes")}</label>
                <Textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder={t("notesPlaceholder")}
                  rows={3}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>

              {status === "error" && (
                <p className="text-red-400 text-sm">{errorMsg}</p>
              )}

              <Button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold h-11"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t("submitting")}
                  </>
                ) : (
                  t("submit")
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  )
}