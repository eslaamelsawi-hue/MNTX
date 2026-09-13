"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Plus, Loader2, HelpCircle } from "lucide-react"

type Question = {
  id: string
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: "a" | "b" | "c" | "d"
}

type Form = { question: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_option: "a" | "b" | "c" | "d" }

const emptyForm: Form = { question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "a" }

export function AdminCertQuiz() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Form>(emptyForm)
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/certification/questions")
      const data = await res.json()
      setQuestions(data.questions ?? [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  const add = async () => {
    setError("")
    if (!form.question.trim() || !form.option_a.trim() || !form.option_b.trim() || !form.option_c.trim() || !form.option_d.trim()) {
      setError("Fill in the question and all 4 options.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/certification/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Failed to add question.")
      } else {
        setForm(emptyForm)
        await load()
      }
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm("Delete this question?")) return
    await fetch(`/api/admin/certification/questions?id=${id}`, { method: "DELETE" })
    load()
  }

  const OPTION_KEYS = ["a", "b", "c", "d"] as const

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><HelpCircle className="h-4 w-4 text-primary" /> Add a question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Question text" rows={2} />
          <div className="grid gap-2 sm:grid-cols-2">
            {OPTION_KEYS.map((k) => (
              <div key={k} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={form.correct_option === k}
                  onChange={() => setForm({ ...form, correct_option: k })}
                  className="shrink-0"
                />
                <Input
                  value={form[`option_${k}` as keyof typeof form] as string}
                  onChange={(e) => setForm({ ...form, [`option_${k}`]: e.target.value })}
                  placeholder={`Option ${k.toUpperCase()}`}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Select the radio button next to the correct answer.</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={add} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Question
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Questions ({questions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : questions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No questions yet — add some above.</p>
          ) : (
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={q.id} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{i + 1}. {q.question}</p>
                    <button onClick={() => remove(q.id)} className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="grid gap-1 text-xs sm:grid-cols-2">
                    {OPTION_KEYS.map((k) => (
                      <p key={k} className={q.correct_option === k ? "font-semibold text-emerald-400" : "text-muted-foreground"}>
                        {k.toUpperCase()}. {q[`option_${k}` as keyof Question] as string}{q.correct_option === k ? " ✓" : ""}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
