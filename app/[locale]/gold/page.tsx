import { Navbar } from "@/components/navbar"
import { GoldPage } from "@/components/gold-page"
import { Footer } from "@/components/footer"

export default function GoldAnalysisPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <GoldPage />
      <Footer />
    </main>
  )
}