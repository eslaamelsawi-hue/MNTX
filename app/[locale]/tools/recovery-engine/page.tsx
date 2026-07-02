import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { RecoveryEngine } from "@/components/tools/recovery-engine"

export default function RecoveryEnginePage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <RecoveryEngine />
      <Footer />
    </main>
  )
}
