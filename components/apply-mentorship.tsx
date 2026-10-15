"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Loader2, Check, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { alexandria } from "@/lib/fonts"

const TOTAL_STEPS = 5
const STEP_LABELS = ["الشروط والأحكام", "بياناتك الشخصية", "خبرتك في التداول", "طريقة تفكيرك والتزامك", "الاستثمار"]

const TERMS: { title: string; lines: string[] }[] = [
  {
    title: "الموافقة على الشروط",
    lines: ["بتقديمك على المينتورشيب أو اشتراكك فيه، فأنت تقر بأنك قرأت هذه الشروط والأحكام وفهمتها ووافقت عليها بالكامل."],
  },
  {
    title: "طبيعة المينتورشيب",
    lines: [
      "المينتورشيب برنامج تعليمي، وكل ما يُقدَّم فيها لا يُعد نصيحة استثمارية أو توصية بالشراء أو البيع.",
      "لا نضمن تحقيق أرباح أو اجتياز تحديات شركات التمويل. النتائج تختلف من شخص لآخر وتعتمد على التزامك وتطبيقك.",
      "أنت المسؤول الوحيد عن قراراتك وصفقاتك وأي أرباح أو خسائر تنتج عنها.",
    ],
  },
  {
    title: "سياسة الاسترداد",
    lines: [
      "لا يحق استرداد المبلغ إذا كان السبب من جهة المشترك، مثل: الغياب عن الجلسات، أو عدم الالتزام بالتطبيق، أو تغيير الرأي، أو الظروف الشخصية، أو عدم تحقيق النتائج المتوقعة، أو مخالفة هذه الشروط.",
      "يحق للمشترك استرداد المبلغ إذا تعذّر تقديم المينتورشيب بسبب من جهتنا، مثل إلغاء البرنامج أو عدم القدرة على تقديم الجلسات المتفق عليها.",
    ],
  },
  {
    title: "حماية المحتوى والتسجيلات",
    lines: [
      "جميع الجلسات وتسجيلاتها والمواد التعليمية ملكية خاصة لـ Mentix Trading، ومخصصة للاستخدام الشخصي للمشترك فقط.",
      "يُمنع منعًا باتًا تسجيل الجلسات أو نسخها أو بيعها أو مشاركتها أو نشرها بأي شكل ومع أي طرف آخر.",
      "أي تسريب أو مشاركة للمحتوى يؤدي إلى إلغاء الاشتراك فورًا دون استرداد، وقد يعرّض صاحبه للمساءلة القانونية.",
    ],
  },
  {
    title: "العضوية والسلوك",
    lines: [
      "العضوية شخصية ولا يجوز نقلها أو مشاركتها مع شخص آخر.",
      "الاحترام شرط أساسي داخل الجلسات والمجتمع الخاص، وأي إساءة أو سلوك غير لائق قد يؤدي إلى الإيقاف دون استرداد.",
      "يحق لنا قبول أو رفض أي طلب تقديم دون إبداء أسباب.",
    ],
  },
  {
    title: "تعديل الشروط",
    lines: ["يحق لـ Mentix Trading تعديل هذه الشروط، وتسري التعديلات على الاشتراكات الجديدة."],
  },
]

const PROCESS = [
  { num: "01", title: "املأ النموذج بالأسفل", desc: "دقائق قليلة. أجب بصراحة عن مستواك وتجربتك وأهدافك، فالصراحة هنا في صالحك." },
  { num: "02", title: "مراجعة طلبك", desc: "يراجع فريقنا كل طلب لنتأكد أن المينتورشيب مناسب لك وأنك مناسب لها." },
  { num: "03", title: "التواصل والبدء", desc: "يتم التواصل مع المقبولين لتأكيد التفاصيل وإرسال كود خصم 40% وبدء التجهيز." },
]

type FormState = {
  full_name: string
  email: string
  whatsapp: string
  age: string
  telegram_username: string
  instagram: string
  country: string

  current_job: string
  hours_per_day: string
  taught_by: string
  market_experience: "real" | "demo" | "none" | ""
  learning_duration: "<6m" | "6m-1y" | "1y-2y" | "2y+" | ""
  tried_funded_account: boolean | null
  passed_funded_account: boolean | null
  past_losses: string

  why_join: string
  top_mistakes: string
  loss_reason_opinion: string
  three_losses_reaction: string
  can_attend_live: boolean | null
  can_dedicate_weekly_time: boolean | null
  commitment_rating: number | null
  what_differentiates: string
  paid_courses_before: string

  investment_range: "<100" | "100-500" | "500-1000" | "1000+" | ""
  investment_reason: string
}

const initialForm: FormState = {
  full_name: "", email: "", whatsapp: "", age: "", telegram_username: "", instagram: "", country: "",
  current_job: "", hours_per_day: "", taught_by: "", market_experience: "", learning_duration: "",
  tried_funded_account: null, passed_funded_account: null, past_losses: "",
  why_join: "", top_mistakes: "", loss_reason_opinion: "", three_losses_reaction: "",
  can_attend_live: null, can_dedicate_weekly_time: null, commitment_rating: null,
  what_differentiates: "", paid_courses_before: "",
  investment_range: "", investment_reason: "",
}

const inputClass = "h-12 rounded-xl border-border bg-background text-foreground focus-visible:border-primary focus-visible:ring-primary/40"
const textareaClass = "min-h-[110px] rounded-xl border-border bg-background text-foreground focus-visible:border-primary focus-visible:ring-primary/40"

const pillClass = (selected: boolean) =>
  `rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
    selected ? "border-primary bg-primary/15 text-primary" : "border-border bg-muted text-muted-foreground hover:border-primary/40 hover:text-foreground"
  }`

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-sm font-medium text-foreground">
      {children} <span className="text-primary">*</span>
    </label>
  )
}

function PillChoice<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} className={pillClass(value === o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function YesNoPills({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => onChange(true)} className={pillClass(value === true)}>نعم</button>
      <button type="button" onClick={() => onChange(false)} className={pillClass(value === false)}>لا</button>
    </div>
  )
}

const GRID_BG = [
  "radial-gradient(ellipse 800px 400px at 50% -10%, hsl(var(--primary) / 0.14), transparent 60%)",
  "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
  "linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
].join(", ")

export function ApplyMentorship({ seatsFull, remaining }: { seatsFull: boolean; remaining: number }) {
  const [step, setStep] = useState(1)
  const [agreed, setAgreed] = useState(false)
  const [form, setForm] = useState<FormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const formRef = useRef<HTMLDivElement>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const step2Valid = !!(form.full_name.trim() && form.email.includes("@") && form.whatsapp.trim() && form.age.trim() && form.telegram_username.trim() && form.instagram.trim() && form.country.trim())
  const step3Valid = !!(form.current_job.trim() && form.hours_per_day.trim() && form.taught_by.trim() && form.market_experience && form.learning_duration && form.tried_funded_account !== null && form.passed_funded_account !== null && form.past_losses.trim())
  const step4Valid = !!(form.why_join.trim() && form.top_mistakes.trim() && form.loss_reason_opinion.trim() && form.three_losses_reaction.trim() && form.can_attend_live !== null && form.can_dedicate_weekly_time !== null && form.commitment_rating !== null && form.what_differentiates.trim() && form.paid_courses_before.trim())
  const step5Valid = !!(form.investment_range && form.investment_reason.trim())

  const stepValid = step === 1 ? agreed : step === 2 ? step2Valid : step === 3 ? step3Valid : step === 4 ? step4Valid : step5Valid

  const scrollToTop = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })

  const goNext = () => {
    if (!stepValid) { setError("يرجى إكمال جميع الحقول المطلوبة قبل المتابعة."); return }
    setError("")
    setStep((s) => Math.min(TOTAL_STEPS, s + 1))
    scrollToTop()
  }
  const goPrev = () => { setError(""); setStep((s) => Math.max(1, s - 1)); scrollToTop() }

  const submit = async () => {
    if (!stepValid) { setError("يرجى إكمال جميع الحقول المطلوبة."); return }
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/mentorship-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, age: form.age ? Number(form.age) : null, terms_accepted: agreed }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "حدث خطأ ما، حاول مرة أخرى."); return }
      setSubmitted(true)
      scrollToTop()
    } catch {
      setError("حدث خطأ ما، حاول مرة أخرى.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      dir="rtl"
      lang="ar"
      className={`${alexandria.className} min-h-screen bg-background text-foreground`}
      style={{ backgroundImage: GRID_BG, backgroundSize: "100% 100%, 32px 32px, 32px 32px" }}
    >
      <div className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        {/* Hero */}
        <section className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" /> مينتورشيب فردي 1-1
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight text-balance md:text-5xl">
            تدرّب تحت إشراف مباشر، <span className="text-primary">بخصم 40%</span> لدفعة أكتوبر
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            10 جلسات أسبوعية مباشرة، متابعة شخصية لصفقاتك وتفكيرك، ومجتمع خاص. قدّم طلبك الآن، ويراجعه فريقنا
            خلال أيام قليلة.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 text-sm text-muted-foreground">
            <span className="rounded-full border border-border bg-muted px-4 py-1.5">10 جلسات زووم أسبوعية</span>
            <span className="rounded-full border border-border bg-muted px-4 py-1.5">متابعة شخصية ومراجعة صفقات</span>
            <span className="rounded-full border border-border bg-muted px-4 py-1.5">مجتمع خاص على تيليجرام</span>
          </div>
        </section>

        {seatsFull ? (
          <section className="mx-auto mt-14 max-w-2xl rounded-3xl border border-border bg-card p-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm font-medium text-muted-foreground">
              اكتملت مقاعد هذه الدفعة
            </span>
            <h2 className="mt-5 text-2xl font-extrabold text-balance md:text-3xl">التقديم مغلق حاليًا</h2>
            <p className="mx-auto mt-3 max-w-md leading-relaxed text-muted-foreground">
              وصلنا للعدد المطلوب من المقبولين في دفعة أكتوبر. تابعنا لمعرفة موعد فتح التقديم للدفعة القادمة.
            </p>
          </section>
        ) : (
          <>
        {/* How it works */}
        <section className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-3">
          {PROCESS.map((p) => (
            <div key={p.num} className="rounded-2xl border border-border bg-card p-5">
              <p className="text-3xl font-extrabold text-primary/70">{p.num}</p>
              <h3 className="mt-3 font-bold text-foreground">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </section>

        {/* Form card */}
        <section
          ref={formRef}
          className="mx-auto mt-10 max-w-4xl scroll-mt-10 rounded-3xl border border-border bg-card p-6 shadow-[0_0_80px_-20px_hsl(var(--primary)/0.2)] md:p-10"
        >
          {submitted ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">تم استلام طلبك!</h2>
              <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                سيراجع فريقنا طلبك ويتواصل معك عبر واتساب أو تيليجرام خلال أيام قليلة لتأكيد التفاصيل وإرسال
                كود خصم 40%.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">دفعة أكتوبر</span>
                  <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{remaining} مقاعد متبقية فقط</span>
                </div>
                <h2 className="text-xl font-extrabold md:text-2xl">نموذج التقديم</h2>
              </div>

              <div className="mt-6 flex gap-1.5">
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                الخطوة <span className="font-semibold text-primary">{step}</span> من {TOTAL_STEPS} • {STEP_LABELS[step - 1]}
              </p>

              {error && (
                <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
              )}

              <div className="mt-6">
                {step === 1 && (
                  <div>
                    <div className="max-h-[420px] space-y-5 overflow-y-auto rounded-2xl border border-border bg-background p-5 md:p-6">
                      {TERMS.map((t, i) => (
                        <div key={i} className="border-b border-border pb-5 last:border-0 last:pb-0">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <h3 className="font-bold text-foreground">{t.title}</h3>
                          </div>
                          <div className="mt-2 space-y-1.5 pr-9 text-sm leading-relaxed text-muted-foreground">
                            {t.lines.map((l, li) => <p key={li}>{l}</p>)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted p-4">
                      <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
                      <span className="text-sm text-foreground">قرأت الشروط والأحكام أعلاه وأوافق عليها بالكامل.</span>
                    </label>
                  </div>
                )}

                {step === 2 && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <FieldLabel>الاسم بالكامل</FieldLabel>
                      <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <FieldLabel>البريد الإلكتروني</FieldLabel>
                      <Input type="email" dir="ltr" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@email.com" className={`${inputClass} text-left`} />
                    </div>
                    <div>
                      <FieldLabel>رقم الواتساب مع كود الدولة</FieldLabel>
                      <Input dir="ltr" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+966 5X XXX XXXX" className={`${inputClass} text-left`} />
                    </div>
                    <div>
                      <FieldLabel>السن</FieldLabel>
                      <Input type="number" min={10} max={100} value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="25" className={inputClass} />
                    </div>
                    <div>
                      <FieldLabel>اسم المستخدم على تليجرام</FieldLabel>
                      <Input dir="ltr" value={form.telegram_username} onChange={(e) => set("telegram_username", e.target.value)} placeholder="@username" className={`${inputClass} text-left`} />
                    </div>
                    <div>
                      <FieldLabel>حساب الإنستجرام</FieldLabel>
                      <Input dir="ltr" value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@username" className={`${inputClass} text-left`} />
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel>الدولة التي تقيم فيها</FieldLabel>
                      <Input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="مثال: مصر، السعودية…" className={inputClass} />
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <FieldLabel>ما هو عملك حاليًا؟</FieldLabel>
                        <Input value={form.current_job} onChange={(e) => set("current_job", e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <FieldLabel>كم ساعة تستطيع تخصيصها يوميًا للتداول؟</FieldLabel>
                        <Input value={form.hours_per_day} onChange={(e) => set("hours_per_day", e.target.value)} className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>من الذي علّمك التداول؟</FieldLabel>
                      <Input value={form.taught_by} onChange={(e) => set("taught_by", e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <FieldLabel>هل تداولت في سوق حقيقي أم ديمو فقط؟</FieldLabel>
                      <PillChoice
                        options={[{ value: "real", label: "حقيقي مع بروكرات" }, { value: "demo", label: "ديمو فقط" }, { value: "none", label: "لم أجرب بعد" }]}
                        value={form.market_experience}
                        onChange={(v) => set("market_experience", v)}
                      />
                    </div>
                    <div>
                      <FieldLabel>منذ متى بدأت تتعلم التداول؟</FieldLabel>
                      <PillChoice
                        options={[{ value: "<6m", label: "أقل من 6 شهور" }, { value: "6m-1y", label: "من 6 شهور إلى سنة" }, { value: "1y-2y", label: "من سنة إلى سنتين" }, { value: "2y+", label: "أكثر من سنتين" }]}
                        value={form.learning_duration}
                        onChange={(v) => set("learning_duration", v)}
                      />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <FieldLabel>هل سبق لك التداول على حساب ممول؟</FieldLabel>
                        <YesNoPills value={form.tried_funded_account} onChange={(v) => set("tried_funded_account", v)} />
                      </div>
                      <div>
                        <FieldLabel>هل سبق ونجحت في الحصول على حساب ممول؟</FieldLabel>
                        <YesNoPills value={form.passed_funded_account} onChange={(v) => set("passed_funded_account", v)} />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>هل خسرت من قبل؟ احكِ باختصار ماذا حدث</FieldLabel>
                      <Textarea value={form.past_losses} onChange={(e) => set("past_losses", e.target.value)} className={textareaClass} />
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6">
                    <div>
                      <FieldLabel>لماذا تريد الانضمام للمينتورشيب؟</FieldLabel>
                      <Textarea value={form.why_join} onChange={(e) => set("why_join", e.target.value)} className={textareaClass} />
                    </div>
                    <div>
                      <FieldLabel>ما أكبر 3 أخطاء تكررها في التداول؟</FieldLabel>
                      <Textarea value={form.top_mistakes} onChange={(e) => set("top_mistakes", e.target.value)} className={textareaClass} />
                    </div>
                    <div>
                      <FieldLabel>في رأيك، ما السبب الرئيسي لخسارة أغلب المتداولين؟</FieldLabel>
                      <Textarea value={form.loss_reason_opinion} onChange={(e) => set("loss_reason_opinion", e.target.value)} className={textareaClass} />
                    </div>
                    <div>
                      <FieldLabel>لو خسرت 3 صفقات متتالية، كيف ستتعامل مع الموقف؟</FieldLabel>
                      <Textarea value={form.three_losses_reaction} onChange={(e) => set("three_losses_reaction", e.target.value)} className={textareaClass} />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <FieldLabel>هل تستطيع الالتزام بحضور الجلسات المباشرة؟</FieldLabel>
                        <YesNoPills value={form.can_attend_live} onChange={(v) => set("can_attend_live", v)} />
                      </div>
                      <div>
                        <FieldLabel>هل تستطيع تخصيص وقت أسبوعي للمراجعة والواجبات؟</FieldLabel>
                        <YesNoPills value={form.can_dedicate_weekly_time} onChange={(v) => set("can_dedicate_weekly_time", v)} />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>قيّم مدى التزامك من 1 إلى 10</FieldLabel>
                      <div dir="ltr" className="flex flex-wrap gap-2">
                        {Array.from({ length: 10 }).map((_, i) => {
                          const n = i + 1
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => set("commitment_rating", n)}
                              className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-bold transition-colors ${
                                form.commitment_rating === n ? "border-primary bg-primary/15 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                              }`}
                            >
                              {n}
                            </button>
                          )
                        })}
                      </div>
                      <div dir="ltr" className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>ضعيف</span><span>ملتزم جدًا</span>
                      </div>
                    </div>
                    <div>
                      <FieldLabel>لو تم قبولك، ما الذي يميزك عن باقي المتقدمين؟</FieldLabel>
                      <Textarea value={form.what_differentiates} onChange={(e) => set("what_differentiates", e.target.value)} className={textareaClass} />
                    </div>
                    <div>
                      <FieldLabel>هل اشتركت من قبل في كورسات أو مينتورشيب مدفوعة؟ لو نعم، احكِ باختصار عن تجربتك</FieldLabel>
                      <Textarea value={form.paid_courses_before} onChange={(e) => set("paid_courses_before", e.target.value)} className={textareaClass} />
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-6">
                    <div>
                      <FieldLabel>كم أنت مستعد أن تستثمر في نفسك وفي التداول خلال الفترة القادمة؟</FieldLabel>
                      <PillChoice
                        options={[{ value: "<100", label: "أقل من 100$" }, { value: "100-500", label: "من 100$ إلى 500$" }, { value: "500-1000", label: "من 500$ إلى 1000$" }, { value: "1000+", label: "أكثر من 1000$" }]}
                        value={form.investment_range}
                        onChange={(v) => set("investment_range", v)}
                      />
                    </div>
                    <div>
                      <FieldLabel>لماذا اخترت هذا الرقم؟</FieldLabel>
                      <Textarea value={form.investment_reason} onChange={(e) => set("investment_reason", e.target.value)} className={textareaClass} />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                {step < TOTAL_STEPS ? (
                  <Button onClick={goNext} className="h-12 flex-1 gap-2 rounded-xl text-base font-bold sm:flex-none sm:px-8">
                    التالي <ChevronLeft className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={submit} disabled={submitting} className="h-12 flex-1 gap-2 rounded-xl text-base font-bold sm:flex-none sm:px-8">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronLeft className="h-4 w-4" />} إرسال الطلب
                  </Button>
                )}
                {step > 1 && (
                  <Button variant="outline" onClick={goPrev} className="h-12 gap-2 rounded-xl text-base">
                    <ChevronRight className="h-4 w-4" /> السابق
                  </Button>
                )}
              </div>
            </>
          )}
        </section>
          </>
        )}
      </div>
    </div>
  )
}
