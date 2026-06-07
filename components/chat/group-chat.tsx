"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, MessageSquare, RefreshCw, Copy, Trash2, ArrowDown } from "lucide-react"

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
  const [refreshing, setRefreshing] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages/group-session?session_id=${sessionId}`)
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (e) {
      console.error("Failed to fetch messages:", e)
    }
    setLoading(false)
    setRefreshing(false)
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

  const deleteMessage = async (messageId: number) => {
    if (!confirm("Delete this message?")) return

    try {
      await fetch(`/api/messages/group-session/${messageId}`, {
        method: "DELETE",
      })
      await fetchMessages()
    } catch (e) {
      console.error("Failed to delete message:", e)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert("Message copied!")
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100)
    }
  }

  const getUniqueParticipants = () => {
    const participants = new Set(messages.map(msg => msg.sender_name))
    return participants.size
  }

  return (
    <Card className="border-slate-700 bg-gradient-to-br from-slate-900/60 to-slate-800/40">
      <CardHeader className="border-b border-slate-700/50 pb-4">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <MessageSquare className="h-5 w-5 text-blue-400" />
            </div>
            <span>Group Session Chat</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              setRefreshing(true)
              await fetchMessages()
            }}
            disabled={refreshing}
            className="text-slate-400 hover:text-slate-200"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30">
            {messages.length} messages
          </Badge>
          <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/30">
            {getUniqueParticipants()} participants
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="h-72 overflow-y-auto space-y-3 bg-slate-800/30 p-4 rounded-lg border border-slate-700/50 scroll-smooth"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500 text-center">
                <p className="text-lg mb-2">🎉</p>
                No messages yet. Be the first to start chatting!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = msg.sender_email === userEmail
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} group`}
                >
                  <div
                    className={`max-w-sm px-4 py-3 rounded-xl transition-all ${
                      isOwnMessage
                        ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-none"
                        : "bg-slate-700/60 text-slate-100 rounded-bl-none border border-slate-600/50"
                    }`}
                  >
                    {!isOwnMessage && (
                      <p className="text-xs font-semibold text-blue-300 mb-1 opacity-90">{msg.sender_name}</p>
                    )}
                    <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/10">
                      <p className="text-xs opacity-70">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(msg.message)}
                          className="h-6 w-6 p-0 hover:bg-white/10"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        {isOwnMessage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMessage(msg.id)}
                            className="h-6 w-6 p-0 hover:bg-red-500/20 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {showScrollButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={scrollToBottom}
            className="w-full border-slate-600 hover:bg-slate-700/50"
          >
            <ArrowDown className="h-4 w-4 mr-2" /> Scroll to latest
          </Button>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Share your thoughts..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            className="bg-slate-800 border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
