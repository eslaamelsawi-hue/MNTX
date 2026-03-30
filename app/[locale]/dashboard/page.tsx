import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { UserDashboard } from "@/components/user-dashboard"

export default function DashboardPage() {
  return (
    <main>
      <Navbar />
      <UserDashboard />
      <Footer />
    </main>
  )
}
