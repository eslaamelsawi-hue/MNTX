"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, HelpCircle } from "lucide-react"

type Ticket = {
  id: number
  subject: string
  status: string
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

export function SupportChat({ userEmail, userName }: { userEmail: string; userName: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [newTicketSubject, setNewTicketSubject] = useState("")
  const [loading, setLoading] = useState(true)
  const [showNewTicket, setShowNewTicket] = useState(false)

  useEffect(() => {
    fetchTickets()
  }, [])

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id)
      const interval = setInterval(() => fetchMessages(selectedTicket.id), 5000)
      return () => clearInterval(interval)
    }
  }, [selectedTicket])

  const fetchTickets = async () => {
    try {
      const res = await fetch(`/api/messages/support?client_email=${userEmail}`)
      const data = await res.json()
      setTickets(data.tickets || [])
    } catch (e) {
      console.error("Failed to fetch tickets:", e)
    }
    setLoading(false)
  }

  const fetchMessages = async (ticketId: number) => {
    try {
      const res = await fetch(`/api/messages/support?client_email=${userEmail}&ticket_id=${ticketId}`)
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (e) {
      console.error("Failed to fetch messages:", e)
    }
  }

  const createTicket = async () => {
    if (!newTicketSubject.trim() || !newMessage.trim()) {
      alert("Please fill in subject and message")
      return
    }

    try {
      const res = await fetch("/api/messages/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_email: userEmail,
          client_name: userName,
          subject: newTicketSubject,
          message: newMessage,
        }),
      })
      const data = await res.json()
      setSelectedTicket(data.ticket)
      setNewTicketSubject("")
      setNewMessage("")
      setShowNewTicket(false)
      await fetchTickets()
    } catch (e) {
      console.error("Failed to create ticket:", e)
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
          client_email: userEmail,
          message: newMessage,
          is_admin: false,
        }),
      })
      setNewMessage("")
      await fetchMessages(selectedTicket.id)
    } catch (e) {
      console.error("Failed to send message:", e)
    }
  }

  return (
    <Card className="border-slate-700 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" /> Support Tickets
          </div>
          <Button
            size="sm"
            onClick={() => setShowNewTicket(!showNewTicket)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            New Ticket
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showNewTicket ? (
          <div className="space-y-4">
            <Input
              placeholder="Issue subject..."
              value={newTicketSubject}
              onChange={(e) => setNewTicketSubject(e.target.value)}
              className="bg-slate-800 border-slate-700"
            />
            <Textarea
              placeholder="Describe your issue..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="bg-slate-800 border-slate-700 h-32"
            />
            <div className="flex gap-2">
              <Button onClick={createTicket} className="bg-blue-600 hover:bg-blue-700">
                Create Ticket
              </Button>
              <Button onClick={() => setShowNewTicket(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {tickets.map((ticket) => (
                <Button
                  key={ticket.id}
                  variant={selectedTicket?.id === ticket.id ? "default" : "outline"}
                  onClick={() => setSelectedTicket(ticket)}
                  className="text-left h-auto p-3"
                >
                  <div className="flex flex-col w-full">
                    <p className="font-semibold text-sm">{ticket.subject}</p>
                    <Badge variant="secondary" className="w-fit mt-1 text-xs">
                      {ticket.status}
                    </Badge>
                  </div>
                </Button>
              ))}
            </div>

            {selectedTicket && (
              <>
                <div className="h-48 overflow-y-auto space-y-3 bg-slate-800/50 p-4 rounded-lg">
                  {messages.length === 0 ? (
                    <p className="text-slate-400 text-center">No messages yet</p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.is_admin || msg.sender_email !== userEmail ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-lg ${
                            msg.is_admin || msg.sender_email !== userEmail
                              ? "bg-amber-600/30 text-amber-100 border border-amber-600/50"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          {(msg.is_admin || msg.sender_email !== userEmail) && (
                            <p className="text-xs font-semibold mb-1">Support Team</p>
                          )}
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
                    placeholder="Reply to support..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    className="bg-slate-800 border-slate-700"
                  />
                  <Button onClick={sendMessage} size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
