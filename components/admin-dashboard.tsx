"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminSubscriptions } from "@/components/admin-subscriptions"
import { AdminCourseAccess } from "@/components/admin-course-access"
import { AdminCourses } from "@/components/admin-courses"
import { AdminWaitlist } from "@/components/admin-waitlist"
import { AdminRecordings } from "@/components/admin-recordings"
import { DMChat } from "@/components/chat/dm-chat"
import { SupportChat } from "@/components/chat/support-chat"
import { MentorSupport } from "@/components/chat/mentor-support"
import { Textarea } from "@/components/ui/textarea"
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  Video,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Users,
  CalendarDays,
  TrendingUp,
  LogOut,
  FileText,
  Edit,
  Eye,
  EyeOff,
  ImageIcon,
  Tag,
  Upload,
  ShoppingCart,
  DollarSign,
  Mail,
  Copy,
  Settings,
  Save,
  Crown,
  BookOpen,
  ClipboardList,
  MessageCircle,
  HelpCircle,
  MessageSquare,
} from "lucide-react"

type Slot = {
  id: string
  date: string
  start_time: string
  end_time: string
  duration: number
  is_booked: boolean
  created_at: string
}

type Booking = {
  id: string
  slot_id: string
  client_name: string
  client_email: string
  client_phone: string | null
  client_message: string | null
  duration: number
  status: string
  zoom_meeting_id: string | null
  zoom_join_url: string | null
  zoom_start_url: string | null
  created_at: string
  availability_slots: Slot
}

type OKXOrder = {
  orderId: string
  plan: string
  amount: string
  email: string
  telegramUsername?: string
  address: string
  chain: string
  status: "pending" | "paid" | "expired"
  createdAt: string
  paidAt?: string
  txId?: string
  tgToken?: string
}

type GoldArticle = {
  id: string
  title_en: string
  title_ar: string
  content_en: string
  content_ar: string
  summary_en: string
  summary_ar: string
  image_url: string
  tags: string[]
  published: boolean
  created_at: string
  updated_at: string
}

type Coupon = {
  id: string
  code: string
  discount_type: "percent" | "fixed"
  discount_value: number
  max_uses: number | null
  used_count: number
  min_order_cents: number
  applicable_plans: string[]
  is_active: boolean
  expires_at: string | null
  created_at: string
  updated_at: string
}

export function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [orders, setOrders] = useState<OKXOrder[]>([])
  const [remainingTokens, setRemainingTokens] = useState<number | null>(null)
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | "pending" | "paid" | "expired">("all")
  const [orderActionLoading, setOrderActionLoading] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [rescheduleBookingId, setRescheduleBookingId] = useState<string | null>(null)
  const [rescheduleSlotId, setRescheduleSlotId] = useState<string>("")
  const [selectedCancelledIds, setSelectedCancelledIds] = useState<Set<string>>(new Set())
  const [deletingCancelled, setDeletingCancelled] = useState(false)

  // Gold articles state
  const [articles, setArticles] = useState<GoldArticle[]>([])
  const [loadingArticles, setLoadingArticles] = useState(true)
  const [articleDialogOpen, setArticleDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<GoldArticle | null>(null)
  const [articleForm, setArticleForm] = useState({
    title_en: "",
    title_ar: "",
    content_en: "",
    content_ar: "",
    summary_en: "",
    summary_ar: "",
    image_url: "",
    tags: "" as string,
    published: true,
  })
  const [uploadingImage, setUploadingImage] = useState(false)

  // Coupons state
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loadingCoupons, setLoadingCoupons] = useState(true)
  const [couponDialogOpen, setCouponDialogOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)

  // Community settings state
  const [discordInvite, setDiscordInvite] = useState("")
  const [telegramGroup, setTelegramGroup] = useState("")
  const [weeklyZoomLink, setWeeklyZoomLink] = useState("")
  const [communitySettingsSaving, setCommunitySettingsSaving] = useState(false)

  // Group sessions state
  const [groupSessions, setGroupSessions] = useState<any[]>([])
  const [loadingGroupSessions, setLoadingGroupSessions] = useState(true)
  const [groupSessionDialogOpen, setGroupSessionDialogOpen] = useState(false)
  const [editingGroupSession, setEditingGroupSession] = useState<any>(null)
  const [groupSessionForm, setGroupSessionForm] = useState({
    title: "",
    description: "",
    session_date: "",
    start_time: "",
    end_time: "",
    max_participants: "",
    zoom_join_url: "",
  })
  const [sessionRegistrations, setSessionRegistrations] = useState<any[]>([])
  const [registrationsDialogOpen, setRegistrationsDialogOpen] = useState(false)
  const [selectedSessionForRegistrations, setSelectedSessionForRegistrations] = useState<any>(null)
  const [couponForm, setCouponForm] = useState({
    code: "",
    discount_type: "percent" as "percent" | "fixed",
    discount_value: "",
    max_uses: "",
    min_order_cents: "",
    applicable_plans: [] as string[],
    expires_at: "",
  })
  const [couponSaving, setCouponSaving] = useState(false)

  // Settings state
  const [weeklyLimit, setWeeklyLimit] = useState<string>("2")
  const [weeklyLimitInput, setWeeklyLimitInput] = useState<string>("2")
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Chat visibility state
  const [hideAllGroupChats, setHideAllGroupChats] = useState(false)
  const [hiddenGroupSessions, setHiddenGroupSessions] = useState<Set<string>>(new Set())

  // Mentor state
  const [isMentor, setIsMentor] = useState(false)
  const [mentorId, setMentorId] = useState<string>("")
  const [mentorName, setMentorName] = useState<string>("")
  const [mentorEmail, setMentorEmail] = useState<string>("")
  const [mentorConversations, setMentorConversations] = useState<any[]>([])
  const [loadingMentorConversations, setLoadingMentorConversations] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState<any>(null)
  const [conversationMessages, setConversationMessages] = useState<any[]>([])
  const [newMentorMessage, setNewMentorMessage] = useState("")

  useEffect(() => {
    // Check login type from localStorage
    const loginType = localStorage.getItem("login_type")
    if (loginType === "mentor") {
      const mId = localStorage.getItem("mentor_id")
      const mName = localStorage.getItem("mentor_name")
      const mEmail = localStorage.getItem("mentor_email")
      if (mId && mName) {
        setIsMentor(true)
        setMentorId(mId)
        setMentorName(mName)
        if (mEmail) {
          setMentorEmail(mEmail)
        }
        console.log("Mentor detected:", { mId, mName, mEmail })
        console.log("LocalStorage mentor_email:", localStorage.getItem("mentor_email"))
      }
    }
  }, [])

  useEffect(() => {
    if (isMentor && mentorId) {
      fetchMentorConversations()
      const interval = setInterval(fetchMentorConversations, 5000)
      return () => clearInterval(interval)
    }
  }, [isMentor, mentorId])

  const fetchMentorConversations = async () => {
    setLoadingMentorConversations(true)
    try {
      const res = await fetch(`/api/mentor/conversations?mentor_id=${mentorId}`)
      const data = await res.json()
      setMentorConversations(data.conversations || [])
    } catch (e) {
      console.error("Failed to fetch conversations:", e)
    }
    setLoadingMentorConversations(false)
  }

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings")
      const data = await res.json()
      if (data.settings?.weekly_booking_limit) {
        setWeeklyLimit(data.settings.weekly_booking_limit)
        setWeeklyLimitInput(data.settings.weekly_booking_limit)
      }
    } catch (e) {
      console.error("Failed to fetch settings:", e)
    }
  }, [])

  const handleSaveWeeklyLimit = async () => {
    const num = parseInt(weeklyLimitInput)
    if (isNaN(num) || num < 1 || num > 20) {
      setSettingsMessage({ type: "error", text: "Limit must be a number between 1 and 20." })
      return
    }
    setSettingsSaving(true)
    setSettingsMessage(null)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "weekly_booking_limit", value: num }),
      })
      const data = await res.json()
      if (data.success) {
        setWeeklyLimit(String(num))
        setSettingsMessage({ type: "success", text: "Weekly limit updated successfully." })
      } else {
        setSettingsMessage({ type: "error", text: data.error || "Failed to save." })
      }
    } catch {
      setSettingsMessage({ type: "error", text: "Something went wrong." })
    }
    setSettingsSaving(false)
    setTimeout(() => setSettingsMessage(null), 4000)
  }

  // Helper function to format date in local timezone (not UTC)
  // Helper function to format date in Cairo timezone
  const formatDateLocal = (date: Date): string => {
    const cairoStr = date.toLocaleString("en-US", { timeZone: "Africa/Cairo" })
    const d = new Date(cairoStr)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getTodayLocal = () => formatDateLocal(new Date())

  // Add slot form
  const [newSlotDate, setNewSlotDate] = useState("")
  const [newSlotStartTime, setNewSlotStartTime] = useState("09:00")
  const [newSlotDuration, setNewSlotDuration] = useState("60")
  const [addingSlot, setAddingSlot] = useState(false)

  // Bulk slot form
  const [bulkDate, setBulkDate] = useState("")
  const [bulkStartHour, setBulkStartHour] = useState("9")
  const [bulkEndHour, setBulkEndHour] = useState("17")
  const [bulkDuration, setBulkDuration] = useState("60")
  const [addingBulk, setAddingBulk] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true)
    try {
      const res = await fetch("/api/admin/orders")
      const data = await res.json()
      if (data.orders) setOrders(data.orders)
      if (typeof data.remainingTokens === "number") setRemainingTokens(data.remainingTokens)
    } catch (e) {
      console.error("Failed to fetch orders:", e)
    }
    setLoadingOrders(false)
  }, [])

  const handleOrderAction = async (orderId: string, action: string) => {
    setOrderActionLoading(`${orderId}-${action}`)
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action }),
      })
      const data = await res.json()
      if (data.success) {
        fetchOrders()
      } else {
        alert(data.error || "Action failed")
      }
    } catch {
      alert("Something went wrong")
    }
    setOrderActionLoading(null)
  }

  const handleDeleteAllPaid = async () => {
    const paidCount = orders.filter(o => o.status === "paid").length
    if (paidCount === 0) { alert("No paid orders to delete"); return }
    if (!confirm(`Permanently delete all ${paidCount} paid order(s)? This cannot be undone.`)) return
    setOrderActionLoading("delete_all_paid")
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_all_paid" }),
      })
      const data = await res.json()
      if (data.success) {
        fetchOrders()
      } else {
        alert(data.error || "Action failed")
      }
    } catch {
      alert("Something went wrong")
    }
    setOrderActionLoading(null)
  }

  const handleExpireAllPending = async () => {
    const pendingCount = orders.filter(o => o.status === "pending").length
    if (pendingCount === 0) { alert("No pending orders"); return }
    if (!confirm(`Expire all ${pendingCount} pending order(s)?`)) return
    setOrderActionLoading("expire_all")
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "expire_all_pending" }),
      })
      const data = await res.json()
      if (data.success) {
        fetchOrders()
      } else {
        alert(data.error || "Action failed")
      }
    } catch {
      alert("Something went wrong")
    }
    setOrderActionLoading(null)
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true)
    try {
      const res = await fetch("/api/admin/bookings")
      const data = await res.json()
      if (data.bookings) setBookings(data.bookings)
    } catch (e) {
      console.error("Failed to fetch bookings:", e)
    }
    setLoadingBookings(false)
  }, [])

  const fetchSlots = useCallback(async () => {
    setLoadingSlots(true)
    try {
      const res = await fetch("/api/admin/slots")
      const data = await res.json()
      if (data.slots) setSlots(data.slots)
    } catch (e) {
      console.error("Failed to fetch slots:", e)
    }
    setLoadingSlots(false)
  }, [])

  useEffect(() => {
    fetchBookings()
    fetchSlots()
    fetchGroupSessions()
    fetchArticles()
    fetchOrders()
    fetchCoupons()
    fetchSettings()
  }, [])

  const formatTime = (time: string) => {
    const [h, m] = time.split(":")
    const hour = parseInt(h)
    const ampm = hour >= 12 ? "PM" : "AM"
    const hour12 = hour % 12 || 12
    return `${hour12}:${m} ${ampm}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const handleAddSlot = async () => {
    if (!newSlotDate || !newSlotStartTime) return
    setAddingSlot(true)
    const dur = parseInt(newSlotDuration)
    const [h, m] = newSlotStartTime.split(":").map(Number)
    const endMinutes = h * 60 + m + dur
    const endH = Math.floor(endMinutes / 60).toString().padStart(2, "0")
    const endM = (endMinutes % 60).toString().padStart(2, "0")

    try {
      await fetch("/api/admin/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots: [{
            date: newSlotDate,
            start_time: `${newSlotStartTime}:00`,
            end_time: `${endH}:${endM}:00`,
            duration: dur,
          }],
        }),
      })
      fetchSlots()
      setNewSlotDate("")
      setNewSlotStartTime("09:00")
    } catch (e) {
      console.error("Failed to add slot:", e)
    }
    setAddingSlot(false)
  }

  const handleBulkAdd = async () => {
    if (!bulkDate) return
    setAddingBulk(true)
    const dur = parseInt(bulkDuration)
    const startH = parseInt(bulkStartHour)
    const endH = parseInt(bulkEndHour)
    const slotsToAdd = []

    for (let h = startH; h < endH; h += dur / 60) {
      const startMinutes = Math.round(h * 60)
      const endMinutes = startMinutes + dur
      if (endMinutes > endH * 60) break

      const sH = Math.floor(startMinutes / 60).toString().padStart(2, "0")
      const sM = (startMinutes % 60).toString().padStart(2, "0")
      const eH = Math.floor(endMinutes / 60).toString().padStart(2, "0")
      const eM = (endMinutes % 60).toString().padStart(2, "0")

      slotsToAdd.push({
        date: bulkDate,
        start_time: `${sH}:${sM}:00`,
        end_time: `${eH}:${eM}:00`,
        duration: dur,
      })
    }

    try {
      await fetch("/api/admin/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: slotsToAdd }),
      })
      fetchSlots()
      setBulkDate("")
    } catch (e) {
      console.error("Failed to bulk add:", e)
    }
    setAddingBulk(false)
  }

  const handleDeleteSlot = async (id: string) => {
    if (!confirm("Delete this slot?")) return
    try {
      await fetch(`/api/admin/slots?id=${id}`, { method: "DELETE" })
      fetchSlots()
    } catch (e) {
      console.error("Failed to delete slot:", e)
    }
  }

  const handleDeleteAllSlots = async () => {
    const availableCount = slots.filter(s => !s.is_booked).length
    if (availableCount === 0) {
      alert("No available slots to delete.")
      return
    }
    if (!confirm(`Delete all ${availableCount} available slots? Booked slots will not be affected.`)) return
    try {
      await fetch("/api/admin/slots?all=true", { method: "DELETE" })
      fetchSlots()
      alert("All available slots deleted successfully.")
    } catch (e) {
      console.error("Failed to delete all slots:", e)
      alert("Failed to delete slots. Please try again.")
    }
  }

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    if (!confirm(`Change status to "${newStatus}"?`)) return
    try {
      await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, status: newStatus }),
      })
      fetchBookings()
      fetchSlots()
    } catch (e) {
      console.error("Failed to update status:", e)
    }
  }

  const handleReschedule = async (bookingId: string) => {
    if (!rescheduleSlotId) return
    try {
      await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, new_slot_id: rescheduleSlotId }),
      })
      fetchBookings()
      fetchSlots()
      setRescheduleBookingId(null)
      setRescheduleSlotId("")
    } catch (e) {
      console.error("Failed to reschedule:", e)
    }
  }

  const toggleCancelledSelection = (id: string) => {
    setSelectedCancelledIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAllCancelled = () => {
    const cancelledIds = bookings.filter(b => b.status === "cancelled").map(b => b.id)
    if (selectedCancelledIds.size === cancelledIds.length) {
      setSelectedCancelledIds(new Set())
    } else {
      setSelectedCancelledIds(new Set(cancelledIds))
    }
  }

  const handleDeleteSelectedCancelled = async () => {
    if (selectedCancelledIds.size === 0) return
    if (!confirm(`Permanently delete ${selectedCancelledIds.size} cancelled booking(s)? This cannot be undone.`)) return
    setDeletingCancelled(true)
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedCancelledIds) }),
      })
      const data = await res.json()
      if (data.success) {
        setSelectedCancelledIds(new Set())
        fetchBookings()
      } else {
        alert(data.error || "Failed to delete")
      }
    } catch (e) {
      console.error("Failed to delete cancelled bookings:", e)
      alert("Something went wrong")
    }
    setDeletingCancelled(false)
  }

  // ========== Coupons functions ==========
  const fetchCoupons = async () => {
    setLoadingCoupons(true)
    try {
      const res = await fetch("/api/admin/coupons")
      const data = await res.json()
      if (data.coupons) setCoupons(data.coupons)
    } catch (e) {
      console.error("Failed to fetch coupons:", e)
    }
    setLoadingCoupons(false)
  }

  const resetCouponForm = () => {
    setCouponForm({
      code: "",
      discount_type: "percent",
      discount_value: "",
      max_uses: "",
      min_order_cents: "",
      applicable_plans: [],
      expires_at: "",
    })
    setEditingCoupon(null)
  }

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setCouponForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value),
      max_uses: coupon.max_uses ? String(coupon.max_uses) : "",
      min_order_cents: coupon.min_order_cents ? String(coupon.min_order_cents / 100) : "",
      applicable_plans: coupon.applicable_plans || [],
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : "",
    })
    setCouponDialogOpen(true)
  }

  const handleSaveCoupon = async () => {
    if (!couponForm.code || !couponForm.discount_value) return
    setCouponSaving(true)
    try {
      const payload: Record<string, unknown> = {
        code: couponForm.code,
        discount_type: couponForm.discount_type,
        discount_value: parseFloat(couponForm.discount_value),
        max_uses: couponForm.max_uses ? parseInt(couponForm.max_uses) : null,
        min_order_cents: couponForm.min_order_cents ? Math.round(parseFloat(couponForm.min_order_cents) * 100) : 0,
        applicable_plans: couponForm.applicable_plans,
        expires_at: couponForm.expires_at || null,
      }
      if (editingCoupon) {
        payload.id = editingCoupon.id
        const res = await fetch("/api/admin/coupons", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) { alert(data.error || "Failed to update coupon"); setCouponSaving(false); return }
      } else {
        const res = await fetch("/api/admin/coupons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) { alert(data.error || "Failed to create coupon"); setCouponSaving(false); return }
      }
      setCouponDialogOpen(false)
      resetCouponForm()
      fetchCoupons()
    } catch {
      alert("Something went wrong")
    }
    setCouponSaving(false)
  }

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Delete this coupon?")) return
    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) { alert(data.error || "Failed to delete"); return }
      fetchCoupons()
    } catch {
      alert("Something went wrong")
    }
  }

  const handleToggleCoupon = async (coupon: Coupon) => {
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: coupon.id, is_active: !coupon.is_active }),
      })
      if (res.ok) fetchCoupons()
    } catch {
      alert("Something went wrong")
    }
  }

  const PLAN_OPTIONS = [
    { value: "starter", label: "Starter" },
    { value: "coaching", label: "Coaching" },
    { value: "extend-1m", label: "Extend 1M" },
    { value: "extend-2m", label: "Extend 2M" },
    { value: "extend-3m", label: "Extend 3M" },
    { value: "extend-6m", label: "Extend 6M" },
    { value: "gold-pro", label: "Gold Pro" },
  ]

  // ========== Gold Articles functions ==========
  const fetchArticles = async () => {
    setLoadingArticles(true)
    try {
      const res = await fetch("/api/admin/articles")
      const data = await res.json()
      if (data.articles) setArticles(data.articles)
    } catch (e) {
      console.error("Failed to fetch articles:", e)
    }
    setLoadingArticles(false)
  }

  const resetArticleForm = () => {
    setEditingArticle(null)
    setArticleForm({ title_en: "", title_ar: "", content_en: "", content_ar: "", summary_en: "", summary_ar: "", image_url: "", tags: "", published: true })
    setArticleDialogOpen(false)
  }

  const handleEditArticle = (article: GoldArticle) => {
    setEditingArticle(article)
    setArticleForm({
      title_en: article.title_en,
      title_ar: article.title_ar,
      content_en: article.content_en,
      content_ar: article.content_ar,
      summary_en: article.summary_en || "",
      summary_ar: article.summary_ar || "",
      image_url: article.image_url || "",
      tags: (article.tags || []).join(", "),
      published: article.published,
    })
    setArticleDialogOpen(true)
  }

  const handleSaveArticle = async () => {
    const payload = {
      ...articleForm,
      tags: articleForm.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
    }
    try {
      const url = "/api/admin/articles"
      const method = editingArticle ? "PATCH" : "POST"
      const reqBody = editingArticle ? { id: editingArticle.id, ...payload } : payload
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(reqBody) })
      const data = await res.json()
      if (!res.ok) {
        alert("Failed to save article: " + (data.error ?? "Unknown error"))
        return
      }
      resetArticleForm()
      fetchArticles()
    } catch (e) {
      console.error("Failed to save article:", e)
      alert("Failed to save article. Check console for details.")
    }
  }

  const handleDeleteArticle = async (id: string) => {
    if (!confirm("Delete this article?")) return
    try {
      await fetch(`/api/admin/articles?id=${id}`, { method: "DELETE" })
      fetchArticles()
    } catch (e) {
      console.error("Failed to delete article:", e)
    }
  }

  const handleTogglePublished = async (article: GoldArticle) => {
    try {
      await fetch("/api/admin/articles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: article.id, published: !article.published }),
      })
      fetchArticles()
    } catch (e) {
      console.error("Failed to toggle published:", e)
    }
  }

  // ========== Group Sessions functions ==========
  const fetchGroupSessions = async () => {
    setLoadingGroupSessions(true)
    try {
      const res = await fetch("/api/group-sessions")
      const data = await res.json()
      if (data.sessions) setGroupSessions(data.sessions)
    } catch (e) {
      console.error("Failed to fetch group sessions:", e)
    }
    setLoadingGroupSessions(false)
  }

  const resetGroupSessionForm = () => {
    setEditingGroupSession(null)
    setGroupSessionForm({ title: "", description: "", session_date: "", start_time: "", end_time: "", max_participants: "", zoom_join_url: "" })
    setGroupSessionDialogOpen(false)
  }

  const handleSaveGroupSession = async () => {
    if (!groupSessionForm.title || !groupSessionForm.session_date || !groupSessionForm.start_time || !groupSessionForm.end_time) {
      alert("Please fill in all required fields")
      return
    }

    try {
      const payload = {
        ...groupSessionForm,
        max_participants: groupSessionForm.max_participants ? parseInt(groupSessionForm.max_participants) : null,
      }
      const url = editingGroupSession ? `/api/group-sessions/${editingGroupSession.id}` : "/api/group-sessions"
      const method = editingGroupSession ? "PATCH" : "POST"
      const reqBody = editingGroupSession ? { id: editingGroupSession.id, ...payload } : payload
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(reqBody) })
      const data = await res.json()
      if (!res.ok) {
        alert("Failed to save session: " + (data.error ?? "Unknown error"))
        return
      }
      resetGroupSessionForm()
      fetchGroupSessions()
    } catch (e) {
      console.error("Failed to save session:", e)
      alert("Failed to save session")
    }
  }

  const handleDeleteGroupSession = async (id: string) => {
    if (!confirm("Delete this group session?")) return
    try {
      await fetch(`/api/group-sessions/${id}`, { method: "DELETE" })
      fetchGroupSessions()
    } catch (e) {
      console.error("Failed to delete session:", e)
    }
  }

  const fetchSessionRegistrations = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/group-sessions/${sessionId}/registrations`)
      const data = await res.json()
      setSessionRegistrations(data.registrations || [])
    } catch (e) {
      console.error("Failed to fetch registrations:", e)
    }
  }

  const handleMarkAttendance = async (registrationId: string, attended: boolean) => {
    if (!selectedSessionForRegistrations) return
    try {
      await fetch(`/api/group-sessions/${selectedSessionForRegistrations.id}/attendance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId, attended })
      })
      fetchSessionRegistrations(selectedSessionForRegistrations.id)
    } catch (e) {
      console.error("Failed to update attendance:", e)
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      case "cancelled": return "bg-red-500/20 text-red-400 border-red-500/30"
      case "completed": return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "rescheduled": return "bg-amber-500/20 text-amber-400 border-amber-500/30"
      default: return ""
    }
  }

  const confirmedCount = bookings.filter(b => b.status === "confirmed").length
  const totalSlots = slots.length
  const availableSlots = slots.filter(s => !s.is_booked).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold text-foreground">
              {isMentor ? `Mentor Dashboard - ${mentorName}` : "Mentix Admin"}
            </span>
            {isMentor && (
              <Badge variant="outline" className="ml-2 bg-blue-500/20 text-blue-300 border-blue-500/50">
                Mentor
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => {
            document.cookie = "admin_session=; path=/; max-age=0"
            window.location.reload()
          }}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Stats cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{confirmedCount}</p>
                <p className="text-sm text-muted-foreground">Upcoming Sessions</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                <CalendarDays className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{availableSlots}</p>
                <p className="text-sm text-muted-foreground">Available Slots</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                <CalendarIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalSlots}</p>
                <p className="text-sm text-muted-foreground">Total Slots</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10">
                <ShoppingCart className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{orders.filter(o => o.status === "paid").length}</p>
                <p className="text-sm text-muted-foreground">Paid Orders</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue={isMentor ? "mentor-messages" : "bookings"} className="space-y-6">
          <TabsList className="bg-muted flex flex-wrap h-auto gap-1">
            {isMentor ? (
              <>
                <TabsTrigger value="mentor-messages" className="gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" /> Messages
                </TabsTrigger>
                <TabsTrigger value="support" className="gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5" /> Support
                </TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
                <TabsTrigger value="slots">Availability</TabsTrigger>
                <TabsTrigger value="group-sessions">Group Sessions</TabsTrigger>
                <TabsTrigger value="articles">Gold Articles</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="coupons">Coupons</TabsTrigger>
                <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                <TabsTrigger value="courses" className="gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" /> Courses
                </TabsTrigger>
                <TabsTrigger value="course-access" className="gap-1.5">
                  <Crown className="h-3.5 w-3.5" /> MNTX Elite
                </TabsTrigger>
                <TabsTrigger value="waitlist" className="gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" /> Waitlist
                </TabsTrigger>
                <TabsTrigger value="recordings" className="gap-1.5">
                  <Video className="h-3.5 w-3.5" /> Recordings
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="mr-1.5 h-3.5 w-3.5" />
                  Settings
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">All Bookings</h2>
              <div className="flex items-center gap-2">
                {selectedCancelledIds.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelectedCancelled}
                    disabled={deletingCancelled}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {deletingCancelled ? "Deleting..." : `Delete Selected (${selectedCancelledIds.size})`}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={fetchBookings}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
              </div>
            </div>

            {loadingBookings ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : bookings.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-12 text-center">
                  <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No bookings yet.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="w-10">
                          {bookings.some(b => b.status === "cancelled") && (
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-border"
                              checked={selectedCancelledIds.size === bookings.filter(b => b.status === "cancelled").length && bookings.some(b => b.status === "cancelled")}
                              onChange={toggleSelectAllCancelled}
                              title="Select all cancelled"
                            />
                          )}
                        </TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Zoom</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking) => (
                        <TableRow key={booking.id} className={`border-border ${booking.status === "cancelled" && selectedCancelledIds.has(booking.id) ? "bg-red-500/5" : ""}`}>
                          <TableCell>
                            {booking.status === "cancelled" && (
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-border"
                                checked={selectedCancelledIds.has(booking.id)}
                                onChange={() => toggleCancelledSelection(booking.id)}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{booking.client_name}</p>
                              <p className="text-sm text-muted-foreground">{booking.client_email}</p>
                              {booking.client_phone && (
                                <p className="text-xs text-muted-foreground">{booking.client_phone}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">
                                {booking.availability_slots ? formatDate(booking.availability_slots.date) : "N/A"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {booking.availability_slots ? formatTime(booking.availability_slots.start_time) : "N/A"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-foreground">{booking.duration} min</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColor(booking.status)}>
                              {booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {booking.zoom_start_url ? (
                              <a
                                href={booking.zoom_start_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                              >
                                <Video className="h-3.5 w-3.5" /> Start
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {booking.status === "confirmed" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-emerald-400 hover:text-emerald-300"
                                    onClick={() => handleStatusChange(booking.id, "completed")}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                  <Dialog open={rescheduleBookingId === booking.id} onOpenChange={(open) => {
                                    if (!open) { setRescheduleBookingId(null); setRescheduleSlotId(""); }
                                  }}>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-amber-400 hover:text-amber-300"
                                        onClick={() => setRescheduleBookingId(booking.id)}
                                      >
                                        <RefreshCw className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-card border-border">
                                      <DialogHeader>
                                        <DialogTitle>Reschedule Booking</DialogTitle>
                                        <DialogDescription>
                                          Select a new available slot for {booking.client_name}
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4 py-4">
                                        <Select value={rescheduleSlotId} onValueChange={setRescheduleSlotId}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select a new slot" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {slots
                                              .filter(s => !s.is_booked && s.duration === booking.duration)
                                              .map(s => (
                                                <SelectItem key={s.id} value={s.id}>
                                                  {formatDate(s.date)} at {formatTime(s.start_time)} ({s.duration} min)
                                                </SelectItem>
                                              ))}
                                          </SelectContent>
                                        </Select>
                                        <Button
                                          className="w-full"
                                          disabled={!rescheduleSlotId}
                                          onClick={() => handleReschedule(booking.id)}
                                        >
                                          Confirm Reschedule
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-300"
                                    onClick={() => handleStatusChange(booking.id, "cancelled")}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Availability Tab */}
          <TabsContent value="slots" className="space-y-6">
            {/* Add single slot */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" /> Add Single Slot
                </CardTitle>
                <CardDescription>Add an individual availability slot</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newSlotDate}
                      onChange={(e) => setNewSlotDate(e.target.value)}
                      min={getTodayLocal()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={newSlotStartTime}
                      onChange={(e) => setNewSlotStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Select value={newSlotDuration} onValueChange={setNewSlotDuration}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="60">60 min</SelectItem>
                        <SelectItem value="90">90 min</SelectItem>
                        <SelectItem value="120">120 min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddSlot} disabled={addingSlot || !newSlotDate}>
                    {addingSlot ? "Adding..." : "Add Slot"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Bulk add slots */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" /> Bulk Add Slots
                </CardTitle>
                <CardDescription>Generate multiple slots for an entire day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={bulkDate}
                      onChange={(e) => setBulkDate(e.target.value)}
                      min={getTodayLocal()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Hour</Label>
                    <Select value={bulkStartHour} onValueChange={setBulkStartHour}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {i.toString().padStart(2, "0")}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>End Hour</Label>
                    <Select value={bulkEndHour} onValueChange={setBulkEndHour}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {i.toString().padStart(2, "0")}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Select value={bulkDuration} onValueChange={setBulkDuration}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="60">60 min</SelectItem>
                        <SelectItem value="90">90 min</SelectItem>
                        <SelectItem value="120">120 min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleBulkAdd} disabled={addingBulk || !bulkDate}>
                    {addingBulk ? "Adding..." : "Generate Slots"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Slots list */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">All Availability Slots</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchSlots}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleDeleteAllSlots}
                  disabled={slots.filter(s => !s.is_booked).length === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete All Available
                </Button>
              </div>
            </div>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : slots.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-12 text-center">
                  <Clock className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No availability slots configured.</p>
                  <p className="text-sm text-muted-foreground">Add slots above to get started.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slots.map((slot) => (
                        <TableRow key={slot.id} className="border-border">
                          <TableCell className="font-medium text-foreground">
                            {formatDate(slot.date)}
                          </TableCell>
                          <TableCell>
                            <span className="text-foreground">
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-foreground">{slot.duration} min</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              slot.is_booked
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            }>
                              {slot.is_booked ? "Booked" : "Available"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {!slot.is_booked && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300"
                                onClick={() => handleDeleteSlot(slot.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="group-sessions" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Group Zoom Sessions</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchGroupSessions}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
                <Dialog open={groupSessionDialogOpen} onOpenChange={setGroupSessionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => { setEditingGroupSession(null); setGroupSessionForm({ title: "", description: "", session_date: "", start_time: "", end_time: "", max_participants: "", zoom_join_url: "" }); }}>
                      <Plus className="mr-2 h-4 w-4" /> New Session
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingGroupSession ? "Edit Session" : "Create Group Session"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Title *</Label>
                        <Input
                          value={groupSessionForm.title}
                          onChange={(e) => setGroupSessionForm({ ...groupSessionForm, title: e.target.value })}
                          placeholder="e.g., Weekly Trading Discussion"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={groupSessionForm.description}
                          onChange={(e) => setGroupSessionForm({ ...groupSessionForm, description: e.target.value })}
                          placeholder="Optional description"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date *</Label>
                        <Input
                          type="date"
                          value={groupSessionForm.session_date}
                          onChange={(e) => setGroupSessionForm({ ...groupSessionForm, session_date: e.target.value })}
                          min={getTodayLocal()}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label>Start Time *</Label>
                          <Input
                            type="time"
                            value={groupSessionForm.start_time}
                            onChange={(e) => setGroupSessionForm({ ...groupSessionForm, start_time: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Time *</Label>
                          <Input
                            type="time"
                            value={groupSessionForm.end_time}
                            onChange={(e) => setGroupSessionForm({ ...groupSessionForm, end_time: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Max Participants</Label>
                        <Input
                          type="number"
                          value={groupSessionForm.max_participants}
                          onChange={(e) => setGroupSessionForm({ ...groupSessionForm, max_participants: e.target.value })}
                          placeholder="Leave empty for unlimited"
                          min={1}
                        />
                      </div>
                      <Button className="w-full" onClick={handleSaveGroupSession}>
                        {editingGroupSession ? "Update Session" : "Create Session"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {loadingGroupSessions ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : groupSessions.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-12 text-center">
                  <Video className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No group sessions yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {groupSessions.map((session) => (
                  <Card key={session.id} className="border-border bg-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground mb-1">{session.title}</h4>
                          {session.description && <p className="text-sm text-muted-foreground mb-2">{session.description}</p>}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-4 h-4" />
                              {formatDate(session.session_date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatTime(session.start_time)} - {formatTime(session.end_time)}
                            </span>
                            {session.max_participants && <span>{session.max_participants} max</span>}
                            <Badge variant="outline" className={session.status === "scheduled" ? "bg-blue-500/20 text-blue-400" : "bg-gray-500/20 text-gray-400"}>
                              {session.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-4">
                          <Dialog open={registrationsDialogOpen && selectedSessionForRegistrations?.id === session.id} onOpenChange={(open) => {
                            if (open) {
                              setSelectedSessionForRegistrations(session)
                              fetchSessionRegistrations(session.id)
                            } else {
                              setRegistrationsDialogOpen(false)
                              setSelectedSessionForRegistrations(null)
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedSessionForRegistrations(session)
                                  setRegistrationsDialogOpen(true)
                                  fetchSessionRegistrations(session.id)
                                }}
                              >
                                <Users className="h-4 w-4 mr-1" /> Registrations
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-card border-border max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Registrations for {selectedSessionForRegistrations?.title}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-3 max-h-96 overflow-y-auto">
                                {sessionRegistrations.length === 0 ? (
                                  <p className="text-muted-foreground text-center py-4">No registrations yet</p>
                                ) : (
                                  sessionRegistrations.map((reg) => (
                                    <div key={reg.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                      <div>
                                        <p className="font-medium text-foreground">{reg.client_name}</p>
                                        <p className="text-sm text-muted-foreground">{reg.client_email}</p>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant={reg.attended ? "default" : "outline"}
                                        onClick={() => handleMarkAttendance(reg.id, !reg.attended)}
                                      >
                                        {reg.attended ? "✓ Attended" : "Mark Attended"}
                                      </Button>
                                    </div>
                                  ))
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingGroupSession(session)
                              setGroupSessionForm({
                                title: session.title,
                                description: session.description || "",
                                session_date: session.session_date,
                                start_time: session.start_time,
                                end_time: session.end_time,
                                max_participants: session.max_participants ? String(session.max_participants) : "",
                                zoom_join_url: session.zoom_join_url || "",
                              })
                              setGroupSessionDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleDeleteGroupSession(session.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Gold Articles Tab */}
          <TabsContent value="articles" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Gold Analysis Articles</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchArticles}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
                <Dialog open={articleDialogOpen} onOpenChange={(open) => {
                  if (!open) { resetArticleForm() }
                  setArticleDialogOpen(open)
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => { resetArticleForm(); setArticleDialogOpen(true) }}>
                      <Plus className="mr-2 h-4 w-4" /> New Article
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingArticle ? "Edit Article" : "New Article"}</DialogTitle>
                      <DialogDescription>
                        {editingArticle ? "Update the article details below." : "Write your gold analysis article in English and Arabic."}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* Image Upload */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Cover Image</Label>
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                            disabled={uploadingImage}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB"); return }
                              setUploadingImage(true)
                              try {
                                const fd = new FormData()
                                fd.append("file", file)
                                const res = await fetch("/api/admin/upload", { method: "POST", body: fd })
                                const data = await res.json()
                                if (!res.ok) { alert("Upload failed: " + (data.error ?? "Unknown error")); return }
                                setArticleForm(f => ({ ...f, image_url: data.url }))
                              } catch (err) {
                                console.error("Upload error:", err)
                                alert("Upload failed. Check console.")
                              } finally {
                                setUploadingImage(false)
                              }
                            }}
                            className="flex-1"
                          />
                          {uploadingImage && <div className="flex items-center text-xs text-muted-foreground"><Upload className="h-4 w-4 animate-pulse mr-1" /> Uploading...</div>}
                        </div>
                        {articleForm.image_url && (
                          <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                            <img src={articleForm.image_url} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            <button
                              type="button"
                              onClick={() => setArticleForm(f => ({ ...f, image_url: "" }))}
                              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                        <Input
                          value={articleForm.image_url}
                          onChange={(e) => setArticleForm(f => ({ ...f, image_url: e.target.value }))}
                          placeholder="Or paste image URL..."
                          type="url"
                          className="text-xs"
                        />
                      </div>
                      {/* Titles */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Title (English) *</Label>
                          <Input
                            value={articleForm.title_en}
                            onChange={(e) => setArticleForm(f => ({ ...f, title_en: e.target.value }))}
                            placeholder="Gold market analysis..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Title (Arabic)</Label>
                          <Input
                            value={articleForm.title_ar}
                            onChange={(e) => setArticleForm(f => ({ ...f, title_ar: e.target.value }))}
                            placeholder="تحليل سوق الذهب..."
                            dir="rtl"
                          />
                        </div>
                      </div>
                      {/* Summaries */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Summary (English)</Label>
                          <Textarea
                            value={articleForm.summary_en}
                            onChange={(e) => setArticleForm(f => ({ ...f, summary_en: e.target.value }))}
                            placeholder="Brief summary shown on card..."
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Summary (Arabic)</Label>
                          <Textarea
                            value={articleForm.summary_ar}
                            onChange={(e) => setArticleForm(f => ({ ...f, summary_ar: e.target.value }))}
                            placeholder="ملخص قصير يظهر على البطاقة..."
                            rows={2}
                            dir="rtl"
                          />
                        </div>
                      </div>
                      {/* Tags */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Tags (comma separated)</Label>
                        <Input
                          value={articleForm.tags}
                          onChange={(e) => setArticleForm(f => ({ ...f, tags: e.target.value }))}
                          placeholder="Gold, Analysis, Market Update"
                        />
                        {articleForm.tags && (
                          <div className="flex flex-wrap gap-1">
                            {articleForm.tags.split(",").map((t: string) => t.trim()).filter(Boolean).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Content */}
                      <div className="space-y-2">
                        <Label>Content (English) *</Label>
                        <Textarea
                          value={articleForm.content_en}
                          onChange={(e) => setArticleForm(f => ({ ...f, content_en: e.target.value }))}
                          placeholder="Write your analysis here..."
                          rows={8}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Content (Arabic)</Label>
                        <Textarea
                          value={articleForm.content_ar}
                          onChange={(e) => setArticleForm(f => ({ ...f, content_ar: e.target.value }))}
                          placeholder="اكتب تحليلك هنا..."
                          rows={8}
                          dir="rtl"
                        />
                      </div>
                      {/* Published + Submit */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="article-published"
                          checked={articleForm.published}
                          onChange={(e) => setArticleForm(f => ({ ...f, published: e.target.checked }))}
                          className="h-4 w-4 rounded border-border"
                        />
                        <Label htmlFor="article-published">Published</Label>
                      </div>
                      <Button
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                        disabled={!articleForm.title_en.trim() || !articleForm.content_en.trim()}
                        onClick={handleSaveArticle}
                      >
                        {editingArticle ? "Update Article" : "Publish Article"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {loadingArticles ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : articles.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-12 text-center">
                  <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No articles yet.</p>
                  <p className="text-sm text-muted-foreground">Create your first gold analysis article above.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {articles.map((article) => (
                  <Card key={article.id} className="border-border bg-card overflow-hidden">
                    {article.image_url && (
                      <div className="relative w-full h-32 overflow-hidden">
                        <img src={article.image_url} alt={article.title_en} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{article.title_en}</CardTitle>
                          {article.title_ar && (
                            <p className="text-sm text-muted-foreground mt-1" dir="rtl">{article.title_ar}</p>
                          )}
                          {article.tags && article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {article.tags.map((tag: string) => (
                                <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <Badge variant="outline" className={article.published
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                          }>
                            {article.published ? "Published" : "Draft"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{article.summary_en || article.content_en}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {new Date(article.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-yellow-400 hover:text-yellow-300"
                            onClick={() => handleTogglePublished(article)}
                          >
                            {article.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-400 hover:text-blue-300"
                            onClick={() => handleEditArticle(article)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleDeleteArticle(article.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          {/* Gold Articles Tab */}

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-foreground">Crypto Orders</h2>
                {remainingTokens !== null && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${remainingTokens === 0 ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-green-500/20 text-green-400 border border-green-500/30"}`}>
                    {remainingTokens === 0 ? "⚠ No TG tokens left" : `${remainingTokens} TG tokens`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-border overflow-hidden text-sm">
                  {(["all", "pending", "paid", "expired"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setOrderStatusFilter(f)}
                      className={`px-3 py-1.5 capitalize transition-colors ${orderStatusFilter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={fetchOrders}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
                {orders.filter(o => o.status === "pending").length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={handleExpireAllPending}
                    disabled={orderActionLoading === "expire_all"}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {orderActionLoading === "expire_all" ? "Expiring…" : `Expire All Pending (${orders.filter(o => o.status === "pending").length})`}
                  </Button>
                )}
                {orders.filter(o => o.status === "paid").length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={handleDeleteAllPaid}
                    disabled={orderActionLoading === "delete_all_paid"}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {orderActionLoading === "delete_all_paid" ? "Deleting…" : `Delete All Paid (${orders.filter(o => o.status === "paid").length})`}
                  </Button>
                )}
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { label: "Total", value: orders.length, color: "text-foreground" },
                { label: "Pending", value: orders.filter(o => o.status === "pending").length, color: "text-yellow-400" },
                { label: "Paid", value: orders.filter(o => o.status === "paid").length, color: "text-green-400" },
                { label: "Revenue (USDT)", value: orders.filter(o => o.status === "paid").reduce((s, o) => s + parseFloat(o.amount), 0).toFixed(2), color: "text-primary" },
              ].map(stat => (
                <Card key={stat.label} className="border-border bg-card">
                  <CardContent className="p-4">
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {loadingOrders ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading orders…
              </div>
            ) : orders.filter(o => orderStatusFilter === "all" || o.status === orderStatusFilter).length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-12 text-center text-muted-foreground">No orders found.</CardContent>
              </Card>
            ) : (
              <Card className="border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telegram</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Network</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>TX ID</TableHead>
                      <TableHead>TG Token</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders
                      .filter(o => orderStatusFilter === "all" || o.status === orderStatusFilter)
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map(order => (
                        <TableRow key={order.orderId}>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="max-w-[110px] truncate font-mono text-xs">{order.orderId}</span>
                              <button onClick={() => copyToClipboard(order.orderId, order.orderId + "-id")} className="shrink-0 text-muted-foreground hover:text-foreground">
                                <Copy className="h-3 w-3" />
                              </button>
                              {copiedId === order.orderId + "-id" && <span className="text-xs text-green-400">Copied</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                            <div>{new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="max-w-[140px] truncate text-sm">{order.email}</span>
                              <button onClick={() => copyToClipboard(order.email, order.orderId + "-email")} className="shrink-0 text-muted-foreground hover:text-foreground">
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {order.telegramUsername ? (
                              <div className="flex items-center gap-1">
                                <span className="max-w-[120px] truncate text-sm">@{order.telegramUsername}</span>
                                <button onClick={() => copyToClipboard(`@${order.telegramUsername}`, order.orderId + "-telegram")} className="shrink-0 text-muted-foreground hover:text-foreground">
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">
                              {order.plan.replace(/-/g, " ")}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold text-yellow-400">{order.amount} USDT</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{order.chain || "—"}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                order.status === "paid"
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : order.status === "pending"
                                  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                  : "bg-red-500/20 text-red-400 border-red-500/30"
                              }
                            >
                              {order.status}
                            </Badge>
                            {order.paidAt && (
                              <div className="mt-1 text-xs text-muted-foreground">{new Date(order.paidAt).toLocaleDateString()}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {order.txId ? (
                              <div className="flex items-center gap-1">
                                <span className="max-w-[80px] truncate font-mono text-xs text-muted-foreground">{order.txId}</span>
                                <button onClick={() => copyToClipboard(order.txId!, order.orderId + "-tx")} className="shrink-0 text-muted-foreground hover:text-foreground">
                                  <Copy className="h-3 w-3" />
                                </button>
                                {copiedId === order.orderId + "-tx" && <span className="text-xs text-green-400">Copied</span>}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {order.tgToken ? (
                              <div className="flex items-center gap-1">
                                <span className="max-w-[80px] truncate font-mono text-xs text-muted-foreground">{order.tgToken}</span>
                                <button onClick={() => copyToClipboard(order.tgToken!, order.orderId + "-tg")} className="shrink-0 text-muted-foreground hover:text-foreground">
                                  <Copy className="h-3 w-3" />
                                </button>
                                {copiedId === order.orderId + "-tg" && <span className="text-xs text-green-400">Copied</span>}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {order.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                                  disabled={orderActionLoading === `${order.orderId}-mark_paid`}
                                  onClick={() => handleOrderAction(order.orderId, "mark_paid")}
                                >
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  {orderActionLoading === `${order.orderId}-mark_paid` ? "…" : "Mark Paid"}
                                </Button>
                              )}
                              {order.status === "paid" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  disabled={orderActionLoading === `${order.orderId}-resend_email`}
                                  onClick={() => handleOrderAction(order.orderId, "resend_email")}
                                >
                                  <Mail className="mr-1 h-3 w-3" />
                                  {orderActionLoading === `${order.orderId}-resend_email` ? "…" : "Resend Email"}
                                </Button>
                              )}
                              {order.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                                  disabled={orderActionLoading === `${order.orderId}-mark_expired`}
                                  onClick={() => handleOrderAction(order.orderId, "mark_expired")}
                                >
                                  <XCircle className="mr-1 h-3 w-3" />
                                  {orderActionLoading === `${order.orderId}-mark_expired` ? "…" : "Expire"}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                                disabled={orderActionLoading === `${order.orderId}-delete`}
                                onClick={() => {
                                  if (confirm(`Permanently delete this ${order.status} order for ${order.email}? This cannot be undone.`)) {
                                    handleOrderAction(order.orderId, "delete")
                                  }
                                }}
                              >
                                <Trash2 className="mr-1 h-3 w-3" />
                                {orderActionLoading === `${order.orderId}-delete` ? "…" : "Delete"}
                              </Button>
                              <div className="flex items-center gap-1">
                                <button
                                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => copyToClipboard(order.address, order.orderId + "-addr")}
                                >
                                  <Copy className="h-3 w-3" /> Address
                                </button>
                                {copiedId === order.orderId + "-addr" && <span className="text-xs text-green-400">Copied</span>}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
          {/* Coupons Tab */}
          <TabsContent value="coupons" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-foreground">Discount Coupons</h2>
              <div className="flex items-center gap-2">
                <Dialog open={couponDialogOpen} onOpenChange={(open) => { setCouponDialogOpen(open); if (!open) resetCouponForm() }}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => { resetCouponForm(); setCouponDialogOpen(true) }}>
                      <Plus className="mr-2 h-4 w-4" /> New Coupon
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingCoupon ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
                      <DialogDescription>
                        {editingCoupon ? "Update coupon details." : "Create a new discount coupon."}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Code</Label>
                        <Input
                          value={couponForm.code}
                          onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                          placeholder="SAVE20"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Type</Label>
                          <Select value={couponForm.discount_type} onValueChange={(v) => setCouponForm({ ...couponForm, discount_type: v as "percent" | "fixed" })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percent">Percentage (%)</SelectItem>
                              <SelectItem value="fixed">Fixed ($)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Value</Label>
                          <Input
                            type="number"
                            value={couponForm.discount_value}
                            onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })}
                            placeholder={couponForm.discount_type === "percent" ? "20" : "50"}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Max Uses <span className="text-xs text-muted-foreground">(optional)</span></Label>
                          <Input
                            type="number"
                            value={couponForm.max_uses}
                            onChange={(e) => setCouponForm({ ...couponForm, max_uses: e.target.value })}
                            placeholder="Unlimited"
                          />
                        </div>
                        <div>
                          <Label>Min Order ($) <span className="text-xs text-muted-foreground">(optional)</span></Label>
                          <Input
                            type="number"
                            value={couponForm.min_order_cents}
                            onChange={(e) => setCouponForm({ ...couponForm, min_order_cents: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Expires At <span className="text-xs text-muted-foreground">(optional)</span></Label>
                        <Input
                          type="date"
                          value={couponForm.expires_at}
                          onChange={(e) => setCouponForm({ ...couponForm, expires_at: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="mb-2 block">Applicable Plans <span className="text-xs text-muted-foreground">(empty = all plans)</span></Label>
                        <div className="flex flex-wrap gap-2">
                          {PLAN_OPTIONS.map((plan) => (
                            <button
                              key={plan.value}
                              type="button"
                              onClick={() => {
                                const plans = couponForm.applicable_plans.includes(plan.value)
                                  ? couponForm.applicable_plans.filter((p) => p !== plan.value)
                                  : [...couponForm.applicable_plans, plan.value]
                                setCouponForm({ ...couponForm, applicable_plans: plans })
                              }}
                              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                                couponForm.applicable_plans.includes(plan.value)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                              }`}
                            >
                              {plan.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button onClick={handleSaveCoupon} disabled={couponSaving || !couponForm.code || !couponForm.discount_value} className="w-full">
                        {couponSaving ? "Saving…" : editingCoupon ? "Update Coupon" : "Create Coupon"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" onClick={fetchCoupons}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
              </div>
            </div>

            {loadingCoupons ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading coupons…
              </div>
            ) : coupons.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-12 text-center">
                  <Tag className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No coupons yet. Create your first coupon.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Min Order</TableHead>
                      <TableHead>Plans</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons.map((coupon) => (
                      <TableRow key={coupon.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-foreground">{coupon.code}</span>
                            <button onClick={() => copyToClipboard(coupon.code, coupon.id + "-code")} className="text-muted-foreground hover:text-foreground">
                              <Copy className="h-3 w-3" />
                            </button>
                            {copiedId === coupon.id + "-code" && <span className="text-xs text-green-400">Copied</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                            {coupon.discount_type === "percent" ? `${coupon.discount_value}%` : `$${coupon.discount_value}`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {coupon.used_count}{coupon.max_uses !== null ? ` / ${coupon.max_uses}` : " / ∞"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {coupon.min_order_cents > 0 ? `$${(coupon.min_order_cents / 100).toFixed(0)}` : "—"}
                        </TableCell>
                        <TableCell>
                          {coupon.applicable_plans && coupon.applicable_plans.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {coupon.applicable_plans.map((p) => (
                                <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0">{p}</Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">All plans</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {coupon.expires_at
                            ? new Date(coupon.expires_at).toLocaleDateString()
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <Badge className={coupon.is_active
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                          }>
                            {coupon.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-yellow-400 hover:text-yellow-300"
                              onClick={() => handleToggleCoupon(coupon)}
                            >
                              {coupon.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-400 hover:text-blue-300"
                              onClick={() => handleEditCoupon(coupon)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300"
                              onClick={() => handleDeleteCoupon(coupon.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-4">
            <AdminSubscriptions />
          </TabsContent>

          {/* Courses management Tab */}
          <TabsContent value="courses" className="space-y-4">
            <AdminCourses />
          </TabsContent>

          {/* MNTX Elite / Course Access Tab */}
          <TabsContent value="course-access" className="space-y-4">
            <AdminCourseAccess />
          </TabsContent>

          {/* Waitlist Tab */}
          <TabsContent value="waitlist" className="space-y-4">
            <AdminWaitlist />
          </TabsContent>

          {/* Recordings Tab */}
          <TabsContent value="recordings" className="space-y-4">
            <AdminRecordings />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Settings</h2>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Booking Rules
                </CardTitle>
                <CardDescription>
                  Control how many sessions clients can book per week.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="weekly-limit">Maximum sessions per week</Label>
                  <p className="text-xs text-muted-foreground">
                    Current limit: <span className="font-semibold text-foreground">{weeklyLimit}</span> session{parseInt(weeklyLimit) !== 1 ? "s" : ""} per week.
                    Changes take effect immediately for all new bookings.
                  </p>
                  <div className="flex items-center gap-3 max-w-xs">
                    <Input
                      id="weekly-limit"
                      type="number"
                      min={1}
                      max={20}
                      value={weeklyLimitInput}
                      onChange={(e) => setWeeklyLimitInput(e.target.value)}
                      className="w-24"
                    />
                    <Button
                      onClick={handleSaveWeeklyLimit}
                      disabled={settingsSaving || weeklyLimitInput === weeklyLimit}
                      size="sm"
                    >
                      {settingsSaving ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>

                {settingsMessage && (
                  <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
                    settingsMessage.type === "success"
                      ? "bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400"
                      : "bg-destructive/10 border border-destructive/20 text-destructive"
                  }`}>
                    {settingsMessage.type === "success"
                      ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                      : <XCircle className="h-4 w-4 shrink-0" />}
                    {settingsMessage.text}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Community Links
                </CardTitle>
                <CardDescription>
                  Configure Discord, Telegram, and Weekly Zoom links for your community.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="discord">Discord Invite Link</Label>
                  <Input
                    id="discord"
                    type="url"
                    placeholder="https://discord.gg/..."
                    value={discordInvite}
                    onChange={(e) => setDiscordInvite(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telegram">Telegram Group Link</Label>
                  <Input
                    id="telegram"
                    type="url"
                    placeholder="https://t.me/..."
                    value={telegramGroup}
                    onChange={(e) => setTelegramGroup(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zoom">Weekly Zoom Link</Label>
                  <Input
                    id="zoom"
                    type="url"
                    placeholder="https://zoom.us/j/..."
                    value={weeklyZoomLink}
                    onChange={(e) => setWeeklyZoomLink(e.target.value)}
                  />
                </div>

                <Button
                  onClick={async () => {
                    setCommunitySettingsSaving(true)
                    try {
                      const updates = [
                        ...(discordInvite ? [{ key: "discord_invite", value: discordInvite }] : []),
                        ...(telegramGroup ? [{ key: "telegram_group", value: telegramGroup }] : []),
                        ...(weeklyZoomLink ? [{ key: "weekly_zoom_link", value: weeklyZoomLink }] : []),
                      ]

                      for (const update of updates) {
                        await fetch("/api/admin/settings", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(update)
                        })
                      }
                      alert("Community links updated successfully!")
                    } catch (e) {
                      alert("Failed to save settings")
                    }
                    setCommunitySettingsSaving(false)
                  }}
                  disabled={communitySettingsSaving}
                >
                  {communitySettingsSaving ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Community Links
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Zoom Integration
                </CardTitle>
                <CardDescription>
                  Authorize Zoom to automatically create meetings for group sessions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Click the button below to authorize Zoom. You'll be redirected to Zoom to approve access.
                </p>
                <a href="/api/zoom/oauth/authorize">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Video className="mr-2 h-4 w-4" />
                    Authorize Zoom Account
                  </Button>
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Group Chat Visibility
                </CardTitle>
                <CardDescription>
                  Control visibility of group session chats.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                    <div>
                      <p className="font-medium text-sm">Hide All Group Chats</p>
                      <p className="text-xs text-slate-400">Disable group chat for all sessions</p>
                    </div>
                    <button
                      onClick={() => setHideAllGroupChats(!hideAllGroupChats)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        hideAllGroupChats ? "bg-red-600" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          hideAllGroupChats ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {!hideAllGroupChats && groupSessions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Hide Individual Sessions</p>
                      <div className="grid gap-2 max-h-48 overflow-y-auto">
                        {groupSessions.map((session) => (
                          <div
                            key={session.id}
                            className="flex items-center justify-between p-2 bg-slate-800/30 rounded border border-slate-700/50"
                          >
                            <span className="text-sm truncate">{session.title}</span>
                            <button
                              onClick={() => {
                                setHiddenGroupSessions((prev) => {
                                  const newSet = new Set(prev)
                                  if (newSet.has(session.id)) {
                                    newSet.delete(session.id)
                                  } else {
                                    newSet.add(session.id)
                                  }
                                  return newSet
                                })
                              }}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                hiddenGroupSessions.has(session.id) ? "bg-red-600" : "bg-slate-600"
                              }`}
                            >
                              <span
                                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                  hiddenGroupSessions.has(session.id) ? "translate-x-4" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mentor Messages Tab */}
          {isMentor && (
            <TabsContent value="mentor-messages" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {/* Conversations List */}
                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-sm">Students</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {mentorConversations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No conversations yet</p>
                    ) : (
                      mentorConversations.map((conv) => (
                        <div
                          key={conv.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border ${
                            selectedConversation?.id === conv.id
                              ? "border-primary bg-primary/10"
                              : "border-slate-700 hover:border-slate-600"
                          }`}
                        >
                          <Button
                            variant="ghost"
                            className="flex-1 justify-start text-left h-auto p-0"
                            onClick={() => setSelectedConversation(conv)}
                          >
                            <div className="flex flex-col w-full">
                              <span className="font-medium text-xs truncate">{conv.student_email}</span>
                              <span className="text-xs opacity-70 truncate">
                                {conv.updated_at ? new Date(conv.updated_at).toLocaleDateString() : ""}
                              </span>
                            </div>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (confirm(`Delete conversation with ${conv.student_email}?`)) {
                                try {
                                  await fetch(`/api/messages/direct/delete?conversation_id=${conv.id}`, {
                                    method: "DELETE",
                                  })
                                  setSelectedConversation(null)
                                  await fetchMentorConversations()
                                } catch (e) {
                                  console.error("Failed to delete conversation:", e)
                                }
                              }
                            }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Chat View */}
                {selectedConversation && mentorId && (
                  <div className="md:col-span-2">
                    <DMChat
                      userEmail={selectedConversation.student_email}
                      mentorId={mentorId}
                      isMentor={true}
                      mentorEmail={mentorEmail}
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {/* Mentor Support Tickets Tab */}
          {isMentor && (
            <TabsContent value="support" className="space-y-4">
              <MentorSupport />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
