import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import BookingCalendar from "@/components/booking-calendar"

export default function BookingPage() {
  return (
    <main>
      <Navbar />
      <BookingCalendar />
      <Footer />
    </main>
  )
}
