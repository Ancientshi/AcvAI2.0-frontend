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
  Download,
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

  const handleDownloadSession = () => {
    const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    const renderMarkdownForPdf = (content: string) => {
      const lines = content.split("\n")
      const blocks: string[] = []
      let listType: "ul" | "ol" | null = null
      let listItems: string[] = []

      const flushList = () => {
        if (!listType || listItems.length === 0) return
        const items = listItems.map((item) => `<li>${item}</li>`).join("")
        blocks.push(`<${listType} class="md-list">${items}</${listType}>`)
        listType = null
        listItems = []
      }

      const inline = (text: string) => {
        let html = escapeHtml(text)
        html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
        html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>")
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        return html
      }

      for (const rawLine of lines) {
        const line = rawLine.trimStart()
        if (line.trim() === "") {
          flushList()
          continue
        }
        if (/^[-*•]\s+/.test(line)) {
          if (listType !== "ul") {
            flushList()
            listType = "ul"
          }
          listItems.push(inline(line.replace(/^[-*•]\s+/, "")))
          continue
        }
        if (/^\d+[.)]\s+/.test(line)) {
          if (listType !== "ol") {
            flushList()
            listType = "ol"
          }
          listItems.push(inline(line.replace(/^\d+[.)]\s+/, "")))
          continue
        }
        flushList()
        if (line.startsWith("### ")) blocks.push(`<h3>${inline(line.slice(4))}</h3>`)
        else if (line.startsWith("## ")) blocks.push(`<h2>${inline(line.slice(3))}</h2>`)
        else if (line.startsWith("# ")) blocks.push(`<h1>${inline(line.slice(2))}</h1>`)
        else if (line.startsWith("> ")) blocks.push(`<blockquote>${inline(line.slice(2))}</blockquote>`)
        else if (/^(-{3,}|_{3,}|\*{3,})$/.test(line)) blocks.push("<hr/>")
        else blocks.push(`<p>${inline(line)}</p>`)
      }
      flushList()
      return blocks.join("")
    }

    const timestamp = new Date().toLocaleString()
    const conversationRows = messages
      .filter((message) => message.content?.trim())
      .map((message, index) => {
        const roleLabel = message.role === "user" ? "Client" : "Achieva AI"
        const renderedContent = renderMarkdownForPdf(message.content)

        return `
          <div class="message-block">
            <div class="message-meta">
              <span class="message-index">#${index + 1}</span>
              <span class="message-role">${roleLabel}</span>
            </div>
            <div class="message-content">${renderedContent}</div>
          </div>
        `
      })
      .join("")

    const reportHtml = `
      <html>
        <head>
          <title>Achieva Session Report</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Inter, Arial, sans-serif; color: #0f172a; background: #f8fafc; }
            .page { position: relative; padding: 40px 50px; min-height: 100vh; background: white; }
            .watermark { position: fixed; top: 45%; left: 20%; font-size: 84px; color: rgba(59, 130, 246, 0.08); transform: rotate(-24deg); font-weight: 800; pointer-events: none; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #dbeafe; padding-bottom: 16px; margin-bottom: 28px; }
            .brand { display: flex; align-items: center; gap: 12px; }
            .logo-chip { width: 42px; height: 42px; border-radius: 10px; background: linear-gradient(135deg, #3a6ff9, #5f7ff0); color: white; display:flex; align-items:center; justify-content:center; font-weight: 700; }
            .title { font-size: 22px; font-weight: 700; margin: 0; }
            .subtitle { margin: 4px 0 0; color: #475569; font-size: 13px; }
            .meta { text-align: right; font-size: 12px; color: #64748b; }
            .section { margin-top: 22px; }
            .section h2 { margin: 0 0 10px; color: #1e40af; font-size: 16px; }
            .contact-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 18px; background: #eff6ff; border: 1px solid #bfdbfe; padding: 14px; border-radius: 12px; font-size: 13px; }
            .contact-item { color: #334155; }
            .message-block { border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 12px; overflow: hidden; }
            .message-meta { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 8px 12px; font-size: 12px; color: #475569; }
            .message-index { font-weight: 700; color: #1d4ed8; }
            .message-content { padding: 12px; line-height: 1.65; font-size: 13px; background: white; }
            .message-content h1, .message-content h2, .message-content h3 { margin: 10px 0 6px; color: #0f172a; }
            .message-content h1 { font-size: 20px; }
            .message-content h2 { font-size: 17px; }
            .message-content h3 { font-size: 15px; }
            .message-content p { margin: 6px 0; }
            .message-content .md-list { margin: 8px 0; padding-left: 20px; }
            .message-content blockquote { margin: 8px 0; padding-left: 10px; border-left: 3px solid #93c5fd; color: #334155; }
            .message-content hr { border: 0; border-top: 1px solid #cbd5e1; margin: 10px 0; }
            .message-content .inline-code { background: #e2e8f0; border-radius: 4px; padding: 1px 4px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
            .footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 12px; color: #64748b; display: flex; justify-content: space-between; }
            @media print { body { background: white; } .page { padding: 24px 30px; } }
          </style>
        </head>
        <body>
          <div class="watermark">ACHIEVA</div>
          <div class="page">
            <div class="header">
              <div class="brand">
                <div class="logo-chip">AI</div>
                <div>
                  <h1 class="title">Achieva Conversation Session Report</h1>
                  <p class="subtitle">Commercial-grade summary for sharing, archiving, and compliance use.</p>
                </div>
              </div>
              <div class="meta">
                <div>Exported: ${timestamp}</div>
                <div>Session ID: ACH-${Date.now()}</div>
              </div>
            </div>
            <div class="section">
              <h2>Contact Information</h2>
              <div class="contact-grid">
                <div class="contact-item"><strong>Client Name:</strong> [Placeholder]</div>
                <div class="contact-item"><strong>Account Manager:</strong> [Placeholder]</div>
                <div class="contact-item"><strong>Email:</strong> [Placeholder]</div>
                <div class="contact-item"><strong>Phone:</strong> [Placeholder]</div>
                <div class="contact-item"><strong>Company:</strong> [Placeholder]</div>
                <div class="contact-item"><strong>Follow-up Date:</strong> [Placeholder]</div>
              </div>
            </div>
            <div class="section">
              <h2>Conversation Transcript</h2>
              ${conversationRows || '<p style="color:#64748b">No messages available in this session.</p>'}
            </div>
            <div class="footer">
              <span>Generated by Achieva AI</span>
              <span>Confidential • Internal / Client Delivery</span>
            </div>
          </div>
        </body>
      </html>
    `

    const printWindow = window.open("", "_blank")
    if (!printWindow) return
    printWindow.document.open()
    printWindow.document.write(reportHtml)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-[#f3f5f9]">
      <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadSession}
              disabled={messages.length === 0}
              className="border-[#c9d8ff] bg-white text-[#2343b2] hover:bg-[#eef3ff]"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Session PDF
            </Button>
          </div>
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
