import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import UnifiedCheckout from "@/components/unified-checkout"
import { PRODUCTS } from "@/lib/products"

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="pt-20">
        <UnifiedCheckout products={PRODUCTS} />
      </main>
      <Footer />
    </div>
  )
}