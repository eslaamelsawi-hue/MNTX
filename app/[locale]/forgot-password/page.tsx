import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
      <Footer />
    </main>
  )
}
