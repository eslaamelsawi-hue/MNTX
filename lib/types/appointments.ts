export interface AvailabilitySlot {
  id: string
  date: string
  start_time: string
  end_time: string
  duration: number
  is_booked: boolean
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  slot_id: string
  client_name: string
  client_email: string
  client_phone?: string
  client_message?: string
  duration: number
  status: "confirmed" | "cancelled" | "completed" | "rescheduled"
  zoom_meeting_id?: string
  zoom_join_url?: string
  zoom_start_url?: string
  meeting_platform?: string
  google_meet_url?: string
  client_timezone?: string
  client_timezone_offset?: string
  confirmation_email_sent: boolean
  created_at: string
  updated_at: string
}

export interface BookingFormData {
  slot_id: string
  client_name: string
  client_email: string
  client_phone: string
  client_message: string
  duration: number
}
