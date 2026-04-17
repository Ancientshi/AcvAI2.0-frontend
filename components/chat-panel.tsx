"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import {
  Paperclip,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  Settings,
  Square,
  Search,
  Database,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { Message, ToolCall } from "@/lib/types"
import { MarkdownRenderer } from "./markdown-renderer"

interface ChatPanelProps {
  messages: Message[]
  isLoading: boolean
  selectedTool: ToolCall | null
  onSelectTool: (tool: ToolCall | null) => void
  onSendMessage: (content: string, file?: File) => void
  onStopGeneration: () => void
}

const getToolIcon = (toolName: string): React.ReactNode => {
  const name = toolName.toLowerCase()
  if (name.includes("search") || name.includes("guideline")) {
    return <Search className="h-4 w-4" />
  }
  if (name.includes("staging") || name.includes("database")) {
    return <Database className="h-4 w-4" />
  }
  if (name.includes("document") || name.includes("file")) {
    return <FileText className="h-4 w-4" />
  }
  return <Settings className="h-4 w-4" />
}

export function ChatPanel({
  messages,
  isLoading,
  selectedTool,
  onSelectTool,
  onSendMessage,
  onStopGeneration,
}: ChatPanelProps) {
  const [input, setInput] = useState("")
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const shouldAutoScrollRef = useRef(true)

  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.toolCalls && lastMessage.toolCalls.length > 0) {
      setExpandedMessages((prev) => new Set([...prev, lastMessage.id]))
    }
    if (shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" })
    }
  }, [messages])

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current
    if (!container) return
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    shouldAutoScrollRef.current = distanceToBottom < 120
  }

  const toggleExpanded = (messageId: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev)
      if (next.has(messageId)) {
        next.delete(messageId)
      } else {
        next.add(messageId)
      }
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() && !selectedFile) return
    onSendMessage(input, selectedFile || undefined)
    setInput("")
    setSelectedFile(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const getToolStatusText = (tool: ToolCall): string => {
    switch (tool.status) {
      case "running":
        return " (Running...)"
      case "completed":
        return tool.duration ? ` (Completed in ${tool.duration.toFixed(2)}s)` : " (Completed)"
      case "error":
        return " (Error)"
      case "active":
        return " (Selected)"
      default:
        return ""
    }
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-[#f3f5f9]">
      <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="space-y-2">
              {message.role === "user" ? (
                <div className="flex justify-start">
                  <div className="max-w-xl rounded-xl bg-gradient-to-r from-[#3a6ff9] to-[#3d58e8] px-5 py-4 text-white shadow-sm">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <button
                        onClick={() => toggleExpanded(message.id)}
                        className="flex w-full items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-left transition-colors hover:bg-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-[#3967f2]" />
                          <span className="font-medium text-slate-700">Hide Details</span>
                        </div>
                        {expandedMessages.has(message.id) ? (
                          <ChevronUp className="h-4 w-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        )}
                      </button>

                      {expandedMessages.has(message.id) && (
                        <div className="mt-3 space-y-2 text-sm text-slate-600">
                          {message.toolCalls.map((tool, index) => (
                            <button
                              key={tool.id}
                              onClick={() => onSelectTool(selectedTool?.id === tool.id ? null : tool)}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                                selectedTool?.id === tool.id
                                  ? "border-[#3967f2] bg-blue-50 text-[#2142ad]"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                              )}
                            >
                              <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100">
                                {tool.status === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : getToolIcon(tool.name)}
                              </span>
                              <span className="flex-1 truncate">
                                {index + 1}. {tool.name}
                                {getToolStatusText(tool)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(() => {
                    const isLast = messages[messages.length - 1]?.id === message.id
                    const isThinking = isLoading && isLast && (!message.content || message.content.trim() === "")

                    if (message.content && message.content.trim() !== "") {
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                          <MarkdownRenderer content={message.content} />
                        </div>
                      )
                    }

                    if (isThinking) {
                      return (
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <Loader2 className="h-4 w-4 animate-spin text-[#3967f2]" />
                          <span className="text-sm text-slate-500">Achieva is preparing for your question.</span>
                        </div>
                      )
                    }

                    return null
                  })()}
                </div>
              )}
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#3967f2] [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#3967f2] [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#3967f2]" />
              </div>
              <span className="text-sm text-slate-500">Achieva is preparing for your question.</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-slate-200 bg-[#f3f5f9] p-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
          <div className="relative rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What would you like to ask Achieva AI?"
              className="min-h-[90px] resize-none border-0 p-0 pr-28 text-base shadow-none focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            {selectedFile && (
              <div className="absolute bottom-14 left-2 flex items-center gap-2 rounded bg-slate-100 px-2 py-1 text-sm">
                <Paperclip className="h-3 w-3" />
                {selectedFile.name}
                <button type="button" onClick={() => setSelectedFile(null)} className="text-slate-500 hover:text-slate-700">
                  ×
                </button>
              </div>
            )}
            <div className="absolute bottom-3 right-3 flex items-center gap-1">
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
              <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="h-9 w-9 rounded-full">
                <Paperclip className="h-4 w-4 text-slate-500" />
              </Button>
              {isLoading ? (
                <Button type="button" size="icon" onClick={onStopGeneration} className="h-9 w-9 rounded-full bg-red-500 hover:bg-red-600">
                  <Square className="h-4 w-4 fill-current" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() && !selectedFile}
                  className="h-9 w-9 rounded-full bg-[#6f90ff] hover:bg-[#5f7ff0]"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </main>
  )
}
