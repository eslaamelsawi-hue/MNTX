import { Navbar } from "@/components/navbar"
import { GoldProPage } from "@/components/gold-pro-page"
import { Footer } from "@/components/footer"

export default function GoldProRoute() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <GoldProPage />
      <Footer />
    </main>
  )
}