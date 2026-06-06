"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, MessageCircle } from "lucide-react"

type Message = {
  id: number
  sender_email: string
  message: string
  created_at: string
}

type Conversation = {
  id: number
  mentor_id: string
  student_email: string
}

export function DMChat({ userEmail, mentorId, isMentor = false }: { userEmail: string; mentorId: string; isMentor?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [])

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages/direct?mentor_id=${mentorId}&student_email=${userEmail}`)
      const data = await res.json()
      setConversation(data.conversation)
      setMessages(data.messages || [])
    } catch (e) {
      console.error("Failed to fetch messages:", e)
    }
    setLoading(false)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversation) return

    try {
      await fetch("/api/messages/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversation.id,
          sender_email: userEmail,
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
          <MessageCircle className="h-5 w-5" /> Direct Message with Mentor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-64 overflow-y-auto space-y-3 bg-slate-800/50 p-4 rounded-lg">
          {loading ? (
            <p className="text-slate-400 text-center">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-slate-400 text-center">No messages yet. Start the conversation!</p>
          ) : (
            messages.map((msg) => {
              const isCurrentUserMessage = isMentor
                ? msg.sender_email !== conversation?.student_email
                : msg.sender_email === userEmail

              return (
                <div key={msg.id} className={`flex ${isCurrentUserMessage ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      isCurrentUserMessage
                        ? "bg-blue-600 text-white"
                        : "bg-amber-600/30 text-amber-100 border border-amber-600/50"
                    }`}
                  >
                    {!isCurrentUserMessage && isMentor && (
                      <p className="text-xs font-semibold mb-1">Student</p>
                    )}
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
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
