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
import type { Patient, Message, ToolCall } from "@/lib/types"
import { MarkdownRenderer } from "./markdown-renderer"

interface ChatPanelProps {
  patient: Patient
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
  patient,
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.toolCalls && lastMessage.toolCalls.length > 0) {
      setExpandedMessages((prev) => new Set([...prev, lastMessage.id]))
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [messages])

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
        return " (Selected/Active)"
      default:
        return ""
    }
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <div className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">
          Consultation: {patient.name} - ID #{patient.id}
        </h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="space-y-2">
              {message.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-md">
                    <div className="rounded-2xl bg-sky-500 px-4 py-3 text-white">{message.content}</div>
                    <div className="mt-1 text-right text-xs text-slate-500">Doctor</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="rounded-xl bg-white p-4 shadow-sm">
                      <button
                        onClick={() => toggleExpanded(message.id)}
                        className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-sky-500" />
                          <span className="font-medium text-slate-700">AI Reasoning & Tool Usage Flow</span>
                          <span className="text-sm text-slate-500">({message.toolCalls.length} tools)</span>
                        </div>
                        {expandedMessages.has(message.id) ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </button>

                      {expandedMessages.has(message.id) && (
                        <div className="mt-2 space-y-2 pl-2">
                          {message.toolCalls.map((tool, index) => (
                            <button
                              key={tool.id}
                              onClick={() => onSelectTool(selectedTool?.id === tool.id ? null : tool)}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors",
                                selectedTool?.id === tool.id
                                  ? "bg-sky-500 text-white"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-6 w-6 items-center justify-center rounded",
                                  selectedTool?.id === tool.id ? "bg-sky-400" : "bg-slate-200",
                                )}
                              >
                                {tool.status === "running" ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  getToolIcon(tool.name)
                                )}
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
                        <div className="rounded-xl bg-white p-4 shadow-sm">
                          <MarkdownRenderer content={message.content} />
                        </div>
                      )
                    }

                    if (isThinking) {
                      return (
                        <div className="flex items-center gap-2 rounded-xl bg-white p-4 shadow-sm">
                          <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
                          <span className="text-sm text-slate-500">AI is thinking...</span>
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
            <div className="flex items-center gap-2 rounded-xl bg-white p-4 shadow-sm">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-sky-500 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-sky-500 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-sky-500" />
              </div>
              <span className="text-sm text-slate-500">AI is thinking...</span>
            </div>
          )}


          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-slate-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask follow-up or upload new data..."
              className="min-h-[56px] resize-none pr-24"
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
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  ×
                </button>
              </div>
            )}
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 w-8"
              >
                <Paperclip className="h-4 w-4 text-slate-400" />
              </Button>
              {isLoading ? (
                <Button
                  type="button"
                  size="icon"
                  onClick={onStopGeneration}
                  className="h-8 w-8 bg-red-500 hover:bg-red-600"
                >
                  <Square className="h-4 w-4 fill-current" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() && !selectedFile}
                  className="h-8 w-8 bg-sky-500 hover:bg-sky-600"
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
