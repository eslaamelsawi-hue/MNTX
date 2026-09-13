"use client"

import { useState } from "react"
import { Award, HelpCircle, ClipboardList } from "lucide-react"
import { AdminCertQuiz } from "@/components/admin-cert-quiz"
import { AdminCertificateSettings } from "@/components/admin-certificate-settings"
import { AdminCertAttempts } from "@/components/admin-cert-attempts"

const SUBTABS = [
  { value: "attempts", label: "Attempts", icon: ClipboardList },
  { value: "quiz", label: "Quiz Questions", icon: HelpCircle },
  { value: "certificate", label: "Certificate", icon: Award },
] as const

export function AdminCertification() {
  const [tab, setTab] = useState<(typeof SUBTABS)[number]["value"]>("attempts")

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Mentorship Certification Test</h2>
        <p className="text-sm text-muted-foreground">
          Available to anyone who's ever held a coaching subscription: a quiz (pass at 75%) plus a 3-week live paper-trading
          challenge (pass at 5% profit) — passing both auto-generates a certificate.
        </p>
      </div>
      <div className="flex gap-2 border-b border-border">
        {SUBTABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === "attempts" && <AdminCertAttempts />}
      {tab === "quiz" && <AdminCertQuiz />}
      {tab === "certificate" && <AdminCertificateSettings />}
    </div>
  )
}
