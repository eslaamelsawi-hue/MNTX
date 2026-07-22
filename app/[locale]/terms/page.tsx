import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const ar = locale === "ar"
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {ar ? "الشروط والأحكام" : "Terms & Conditions"}
        </h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          {ar
            ? "سيتم إضافة نص الشروط والأحكام الكامل هنا قريباً. باستخدامك للمنصة فإنك توافق على سياساتنا."
            : "The full Terms & Conditions will be added here soon. By using this platform you agree to our policies."}
        </p>
      </section>
      <Footer />
    </main>
  )
}
