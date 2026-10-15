import { Check } from "lucide-react"
import { alexandria } from "@/lib/fonts"

const GRID_BG = [
  "radial-gradient(ellipse 800px 400px at 50% -10%, hsl(var(--primary) / 0.14), transparent 60%)",
  "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
  "linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
].join(", ")

type Section = { title: string; badge?: string; items: string[] }

const SECTION_ROWS: Section[][] = [
  [
    {
      title: "خلال الـ8 أسابيع",
      items: [
        "شرح وتدريب خطوة بخطوة",
        "جلسات مباشرة معي",
        "تطبيق عملي على كل درس",
        "تطوير طريقة تفكيرك في التداول",
        "متابعة تطورك طوال المينتورشيب",
        "متابعة ودعم مستمر",
      ],
    },
    {
      title: "المتابعة الفردية",
      badge: "1-on-1",
      items: [
        "جلسة فردية معي كل أسبوع",
        "إدارة مخاطر مصممة حسب أسلوبك وحساباتك",
        "خطة مخصصة لتكبير حسابك تدريجيًا",
        "ملاحظات شخصية على تنفيذ صفقاتك",
        "مراجعة شخصية لصفقاتك",
        "تعديل وتحسين طريقة تفكيرك أثناء التداول",
        "رقم هاتف خاص للتواصل المباشر",
      ],
    },
  ],
  [
    {
      title: "التداول والتعليم",
      items: [
        "استراتيجية تداول مثبتة وقابلة للتطبيق",
        "نظام متكامل لإدارة المخاطر",
        "أفكار وإعدادات تداول",
        "تحليل وتعليق يومي على السوق",
        "تحليل ومراجعة شاملة للسوق كل ليلة",
        "مكتبة تعليمية من الألف إلى الياء",
        "مراجعة وتحليل الصفقات",
        "تطوير عقلية المتداول",
        "تحليل مباشر لصفقاتك: أين أخطأت وما الذي فاتك",
      ],
    },
  ],
  [
    {
      title: "عضوية المجتمع الخاص",
      items: [
        "عضوية في المجتمع الخاص والحصري على ديسكورد",
        "تواصل مع متداولين جادين",
        "جوائز وسحوبات حصرية",
        "وصول مدى الحياة",
      ],
    },
    {
      title: "أولوية في كل شيء",
      items: [
        "أولوية في بدء المينتورشيب والتجهيز لها",
        "دعم بأولوية",
        "أولوية في مراجعة صفقاتك",
        "ردود أسرع",
      ],
    },
  ],
  [
    {
      title: "مميزات إضافية",
      items: [
        "هدايا ومميزات إضافية للمشتركين",
        "وصول مجاني للقسم المدفوع في الديسكورد",
        "مواد وأدوات تعليمية إضافية",
      ],
    },
  ],
]

function SectionBlock({ section }: { section: Section }) {
  return (
    <div>
      <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
        {section.title}
        {section.badge && (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{section.badge}</span>
        )}
      </h3>
      <ul className="space-y-3">
        {section.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function MentorshipFeatures() {
  return (
    <div
      dir="rtl"
      lang="ar"
      className={`${alexandria.className} min-h-screen bg-background text-foreground`}
      style={{ backgroundImage: GRID_BG, backgroundSize: "100% 100%, 32px 32px, 32px 32px" }}
    >
      <div className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <section className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" /> مينتورشيب فردي 1-1
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight text-balance md:text-5xl">
            مميزات <span className="text-primary">المينتورشيب</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            كل ما تحصل عليه عند انضمامك لمينتورشيب Mentix الفردي — تدريب، متابعة، ومجتمع، على مدار 8 أسابيع.
          </p>
        </section>

        <section className="mx-auto mt-14 max-w-4xl rounded-3xl border border-border bg-card p-6 shadow-[0_0_80px_-20px_hsl(var(--primary)/0.2)] md:p-10">
          {SECTION_ROWS.map((row, i) => (
            <div key={i} className={i > 0 ? "mt-8 border-t border-border pt-8" : ""}>
              <div className={row.length > 1 ? "grid gap-8 sm:grid-cols-2" : ""}>
                {row.map((section) => (
                  <SectionBlock key={section.title} section={section} />
                ))}
              </div>
            </div>
          ))}

          <div className="mt-10 border-t border-border pt-8 text-center">
            <a
              href="/en/apply"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-8 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              قدّم على المينتورشيب
              <span aria-hidden="true">←</span>
            </a>
            <p className="mt-3 text-xs text-muted-foreground">مقاعد دفعة أكتوبر محدودة، والتقديم يُغلق عند اكتمال العدد.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
