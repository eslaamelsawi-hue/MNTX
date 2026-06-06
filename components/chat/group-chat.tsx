"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, MessageSquare } from "lucide-react"

type Message = {
  id: number
  sender_email: string
  sender_name: string
  message: string
  created_at: string
}

export function GroupChat({ sessionId, userEmail, userName }: { sessionId: string; userEmail: string; userName: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000) // Auto-refresh every 3 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages/group-session?session_id=${sessionId}`)
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (e) {
      console.error("Failed to fetch messages:", e)
    }
    setLoading(false)
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      await fetch("/api/messages/group-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          sender_email: userEmail,
          sender_name: userName,
          message: newMessage,
        }),
      })
      setNewMessage("")
      await fetchMessages()
    } catch (e) {
      console.error("Failed to send message:", e)
    }
  }

  return (
    <Card className="border-slate-700 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Group Session Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-64 overflow-y-auto space-y-3 bg-slate-800/50 p-4 rounded-lg">
          {loading ? (
            <p className="text-slate-400 text-center">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-slate-400 text-center">No messages yet. Start chatting!</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_email === userEmail ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.sender_email === userEmail
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-100"
                  }`}
                >
                  {msg.sender_email !== userEmail && (
                    <p className="text-xs font-semibold opacity-80 mb-1">{msg.sender_name}</p>
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
            placeholder="Share your thoughts..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            className="bg-slate-800 border-slate-700"
          />
          <Button onClick={sendMessage} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
