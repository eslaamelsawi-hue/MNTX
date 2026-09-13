import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildCertificateSvg } from "@/lib/certificate"
import { CertificateActions } from "@/components/certificate-actions"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default async function CertificateResultPage({ params }: { params: Promise<{ locale: string; attemptId: string }> }) {
  const { locale, attemptId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) redirect(`/${locale}/login`)

  const admin = createAdminClient()
  const { data: attempt } = await admin.from("cert_test_attempts").select("*").eq("id", attemptId).single()
  if (!attempt) notFound()
  if (attempt.client_email !== user.email.toLowerCase().trim()) notFound()

  if (attempt.status !== "graded_passed") {
    return (
      <main>
        <Navbar />
        <div className="mx-auto max-w-lg px-4 py-24 text-center text-muted-foreground">
          Your certificate isn&apos;t available — it&apos;s only issued once you pass the certification test.
        </div>
        <Footer />
      </main>
    )
  }

  const { data: settings } = await admin.from("cert_certificate_settings").select("*").eq("id", "main").maybeSingle()
  if (!settings?.template_url || !settings.image_width || !settings.image_height) {
    return (
      <main>
        <Navbar />
        <div className="mx-auto max-w-lg px-4 py-24 text-center text-muted-foreground">
          Congratulations on passing! Your certificate is being set up — please check back shortly or contact support.
        </div>
        <Footer />
      </main>
    )
  }

  const imgRes = await fetch(settings.template_url)
  const buf = Buffer.from(await imgRes.arrayBuffer())
  const mimeType = imgRes.headers.get("content-type") || "image/png"
  const templateBase64 = buf.toString("base64")

  const dateStr = new Date(attempt.finalized_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  const svg = buildCertificateSvg({
    templateBase64,
    mimeType,
    width: settings.image_width,
    height: settings.image_height,
    name: attempt.client_name,
    date: dateStr,
    namePct: { x: settings.name_x_pct, y: settings.name_y_pct },
    datePct: { x: settings.date_x_pct, y: settings.date_y_pct },
    fontSize: settings.font_size,
    fontColor: settings.font_color,
    fontFamily: settings.font_family,
  })

  return (
    <main>
      <div className="print:hidden">
        <Navbar />
      </div>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <h1 className="text-xl font-bold text-foreground">Your Certificate</h1>
          <CertificateActions svg={svg} fileName={`mentix-certificate-${attempt.client_name.replace(/\s+/g, "-")}.svg`} />
        </div>
        <div className="overflow-hidden rounded-xl border border-border" dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
      <div className="print:hidden">
        <Footer />
      </div>
    </main>
  )
}
