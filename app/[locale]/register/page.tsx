import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { AuthForm } from "@/components/auth/auth-form"

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
      <Footer />
    </main>
  )
}
