import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default async function CommunityPolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const ar = locale === "ar"
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {ar ? "سياسة المجتمع" : "Community Policy"}
        </h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          {ar
            ? "سيتم إضافة سياسة المجتمع الكاملة هنا قريباً. نتوقع من جميع الأعضاء الاحترام والالتزام بقواعد المجتمع."
            : "The full Community Policy will be added here soon. All members are expected to be respectful and follow the community rules."}
        </p>
      </section>
      <Footer />
    </main>
  )
}
