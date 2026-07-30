import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
      <Footer />
    </main>
  )
}
