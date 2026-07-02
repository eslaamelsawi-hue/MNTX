import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ToolsHub } from "@/components/tools/tools-hub"

export default function ToolsPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <ToolsHub />
      <Footer />
    </main>
  )
}
