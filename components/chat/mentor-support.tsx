"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, HelpCircle } from "lucide-react"

type Ticket = {
  id: number
  subject: string
  status: string
  client_email: string
  client_name: string
  created_at: string
  updated_at: string
}

type Message = {
  id: number
  sender_email: string
  message: string
  is_admin: boolean
  created_at: string
}

export function MentorSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTickets()
    const interval = setInterval(fetchTickets, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id)
      const interval = setInterval(() => fetchMessages(selectedTicket.id), 3000)
      return () => clearInterval(interval)
    }
  }, [selectedTicket])

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/admin/support-tickets")
      const data = await res.json()
      setTickets(data.tickets || [])
    } catch (e) {
      console.error("Failed to fetch tickets:", e)
    }
    setLoading(false)
  }

  const fetchMessages = async (ticketId: number) => {
    try {
      const res = await fetch(`/api/messages/support?ticket_id=${ticketId}`)
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (e) {
      console.error("Failed to fetch messages:", e)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return

    try {
      await fetch("/api/messages/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: selectedTicket.id,
          client_email: selectedTicket.client_email,
          message: newMessage,
          is_admin: true,
        }),
      })
      setNewMessage("")
      await fetchMessages(selectedTicket.id)
    } catch (e) {
      console.error("Failed to send message:", e)
    }
  }

  const closeTicket = async () => {
    if (!selectedTicket) return

    try {
      await fetch(`/api/admin/support-tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      })
      await fetchTickets()
      setSelectedTicket(null)
    } catch (e) {
      console.error("Failed to close ticket:", e)
    }
  }

  return (
    <Card className="border-slate-700 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" /> Support Tickets
          </div>
          <span className="text-sm font-normal text-slate-400">{tickets.length} total</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {loading ? (
            <p className="col-span-2 text-slate-400 text-center py-4">Loading tickets...</p>
          ) : tickets.length === 0 ? (
            <p className="col-span-2 text-slate-400 text-center py-4">No support tickets</p>
          ) : (
            tickets.map((ticket) => (
              <Button
                key={ticket.id}
                variant={selectedTicket?.id === ticket.id ? "default" : "outline"}
                onClick={() => setSelectedTicket(ticket)}
                className="text-left h-auto p-3 justify-start"
              >
                <div className="flex flex-col w-full">
                  <p className="font-semibold text-sm">{ticket.subject}</p>
                  <p className="text-xs text-slate-400 truncate">{ticket.client_email}</p>
                  <Badge
                    variant="secondary"
                    className={`w-fit mt-1 text-xs ${
                      ticket.status === "open"
                        ? "bg-amber-600/30 text-amber-200"
                        : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {ticket.status}
                  </Badge>
                </div>
              </Button>
            ))
          )}
        </div>

        {selectedTicket && (
          <>
            <div className="border-t border-slate-700 pt-4">
              <div className="mb-3 text-sm">
                <p className="font-semibold">From: {selectedTicket.client_name}</p>
                <p className="text-slate-400 text-xs">{selectedTicket.client_email}</p>
              </div>
            </div>

            <div className="h-48 overflow-y-auto space-y-3 bg-slate-800/50 p-4 rounded-lg">
              {messages.length === 0 ? (
                <p className="text-slate-400 text-center">No messages yet</p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.is_admin ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.is_admin
                          ? "bg-amber-600/30 text-amber-100 border border-amber-600/50"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      {msg.is_admin && <p className="text-xs font-semibold mb-1">You</p>}
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Reply to ticket..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                className="bg-slate-800 border-slate-700"
              />
              <Button onClick={sendMessage} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {selectedTicket.status === "open" && (
              <Button
                onClick={closeTicket}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Close Ticket
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
