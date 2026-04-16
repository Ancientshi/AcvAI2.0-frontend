"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { Header } from "./header"
import { PatientSidebar } from "./patient-sidebar"
import { ChatPanel } from "./chat-panel"
import { ToolDetailsPanel } from "./tool-details-panel"
import type { Patient, Message, ToolCall } from "@/lib/types"

const USER_STORAGE_KEY = "dermacare_user_id"
const APP_STATE_KEY = "dermacare_app_state_v1"
const MAX_MESSAGES_PER_SESSION = 20

function generateId(): string {
  return crypto.randomUUID()
}

function getCurrentDate(): string {
  const now = new Date()
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (now.toDateString() === today.toDateString()) return "Today"
  if (now.toDateString() === yesterday.toDateString()) return "Yesterday"
  return now.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "anonymous"
  const existing = window.localStorage.getItem(USER_STORAGE_KEY)
  if (existing && existing.trim()) return existing

  const newId = `user_${generateId()}`
  window.localStorage.setItem(USER_STORAGE_KEY, newId)
  return newId
}

type PersistedState = {
  v: 1
  patients: Patient[]
  selectedSessionId: string
  messagesBySession: Record<string, Message[]>
}

function safeParse<T>(s: string | null): T | null {
  if (!s) return null
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}

function trimMessagesMap(map: Record<string, Message[]>, maxN: number) {
  const out: Record<string, Message[]> = {}
  for (const [sid, msgs] of Object.entries(map)) {
    const arr = Array.isArray(msgs) ? msgs : []
    out[sid] = arr.length > maxN ? arr.slice(arr.length - maxN) : arr
  }
  return out
}

export function DermaCareApp() {
  const [userId, setUserId] = useState<string>("")

  // === 默认初始会话 ===
  const initialSessionId = useMemo(() => `sess_${generateId()}`, [])
  const initialPatients: Patient[] = useMemo(
    () => [
      {
        id: `pt_${generateId()}`,
        name: "New Consultation",
        condition: "Pending",
        date: getCurrentDate(),
        isActive: true,
        sessionId: initialSessionId,
      },
    ],
    [initialSessionId],
  )
  const initialMessagesBySession = useMemo<Record<string, Message[]>>(
    () => ({ [initialSessionId]: [] }),
    [initialSessionId],
  )

  const [patients, setPatients] = useState<Patient[]>(initialPatients)
  const [selectedPatient, setSelectedPatient] = useState<Patient>(initialPatients[0])
  const [messagesBySession, setMessagesBySession] = useState<Record<string, Message[]>>(initialMessagesBySession)

  const [selectedTool, setSelectedTool] = useState<ToolCall | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const abortControllerRef = useRef<AbortController | null>(null)

  // === 启动时：恢复 userId + 恢复聊天历史（并裁剪到每 session 20 条） ===
  useEffect(() => {
    setUserId(getOrCreateUserId())

    if (typeof window === "undefined") return
    const saved = safeParse<PersistedState>(window.localStorage.getItem(APP_STATE_KEY))
    if (!saved || saved.v !== 1) return

    const restoredPatients = Array.isArray(saved.patients) ? saved.patients : []
    const restoredMessages = trimMessagesMap(saved.messagesBySession || {}, MAX_MESSAGES_PER_SESSION)

    // 找 selected session
    const selected =
      restoredPatients.find((p) => p.sessionId === saved.selectedSessionId) ||
      restoredPatients.find((p) => p.isActive) ||
      restoredPatients[0]

    if (!selected) return

    // 修正 isActive
    const fixedPatients = restoredPatients.map((p) => ({
      ...p,
      isActive: p.sessionId === selected.sessionId,
    }))

    setPatients(fixedPatients)
    setSelectedPatient(selected)
    setMessagesBySession(restoredMessages)
  }, [])

  // === 自动保存（debounce 300ms；保存前也会裁剪） ===
  useEffect(() => {
    if (typeof window === "undefined") return

    const t = window.setTimeout(() => {
      try {
        const trimmed = trimMessagesMap(messagesBySession, MAX_MESSAGES_PER_SESSION)
        const state: PersistedState = {
          v: 1,
          patients,
          selectedSessionId: selectedPatient.sessionId,
          messagesBySession: trimmed,
        }
        window.localStorage.setItem(APP_STATE_KEY, JSON.stringify(state))
      } catch (e) {
        // localStorage 满了或序列化失败就忽略（避免影响主流程）
        console.warn("[v0] Failed to persist state:", e)
      }
    }, 300)

    return () => window.clearTimeout(t)
  }, [patients, selectedPatient.sessionId, messagesBySession])

  const messages = messagesBySession[selectedPatient.sessionId] || []

  const handleNewChat = useCallback(() => {
    const newSessionId = `sess_${generateId()}`
    const newPatient: Patient = {
      id: `pt_${generateId()}`,
      name: "New Consultation",
      condition: "Pending",
      date: getCurrentDate(),
      isActive: true,
      sessionId: newSessionId,
    }

    setPatients((prev) => [newPatient, ...prev.map((p) => ({ ...p, isActive: false }))])
    setSelectedPatient(newPatient)
    setMessagesBySession((prev) => ({
      ...prev,
      [newSessionId]: [],
    }))
    setSelectedTool(null)
  }, [])

  const handleSelectPatient = useCallback((patient: Patient) => {
    setPatients((prev) =>
      prev.map((p) => ({
        ...p,
        isActive: p.sessionId === patient.sessionId,
      })),
    )
    setSelectedPatient(patient)
    setSelectedTool(null)
  }, [])

  const handleSelectTool = useCallback((tool: ToolCall | null) => {
    setSelectedTool(tool)
  }, [])

  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
    }
  }, [])

  const appendAndTrim = useCallback((sid: string, add: Message[]) => {
    setMessagesBySession((prev) => {
      const nextArr = [...(prev[sid] || []), ...add]
      const trimmed = nextArr.length > MAX_MESSAGES_PER_SESSION ? nextArr.slice(nextArr.length - MAX_MESSAGES_PER_SESSION) : nextArr
      return { ...prev, [sid]: trimmed }
    })
  }, [])

  const updateAssistantInSession = useCallback((sid: string, assistantId: string, updater: (m: Message) => Message) => {
    setMessagesBySession((prev) => {
      const arr = prev[sid] || []
      const next = arr.map((m) => (m.id === assistantId ? updater(m) : m))
      // 更新后依然确保只留 20 条
      const trimmed = next.length > MAX_MESSAGES_PER_SESSION ? next.slice(next.length - MAX_MESSAGES_PER_SESSION) : next
      return { ...prev, [sid]: trimmed }
    })
  }, [])

  const handleSendMessage = useCallback(
    async (content: string, file?: File) => {
      const currentSessionId = selectedPatient.sessionId

      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content,
      }

      appendAndTrim(currentSessionId, [userMessage])
      setIsLoading(true)

      // 第一条消息：用内容做病例标题（这里用“发送前”的 messages.length 不一定准确，但足够用）
      if ((messagesBySession[currentSessionId] || []).length === 0) {
        const shortContent = content.slice(0, 30) + (content.length > 30 ? "..." : "")
        setPatients((prev) =>
          prev.map((p) => (p.sessionId === currentSessionId ? { ...p, name: shortContent, condition: "Active" } : p)),
        )
        setSelectedPatient((prev) => ({
          ...prev,
          name: shortContent,
          condition: "Active",
        }))
      }

      try {
        const formData = new FormData()
        formData.append("message", content)
        formData.append("stream", "true")
        formData.append("session_id", currentSessionId)

        const effectiveUserId = userId || getOrCreateUserId()
        formData.append("user_id", effectiveUserId)

        if (file) formData.append("file", file)

        const response = await fetch("/api/chat", {
          method: "POST",
          body: formData,
          signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to get response")
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        const assistantId = (Date.now() + 1).toString()
        let assistantMessage: Message = {
          id: assistantId,
          role: "assistant",
          content: "",
          toolCalls: [],
        }

        appendAndTrim(currentSessionId, [assistantMessage])

        if (reader) {
          let buffer = ""
          const toolCallsMap = new Map<string, ToolCall>()

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split("\n")
              buffer = lines.pop() || ""

              let currentEventType = ""

              for (const line of lines) {
                if (line.startsWith("event:")) {
                  currentEventType = line.slice(6).trim()
                  continue
                }

                if (line.startsWith("data:")) {
                  try {
                    const jsonStr = line.slice(5).trim()
                    if (!jsonStr) continue

                    const data = JSON.parse(jsonStr)
                    const eventType = data.event || currentEventType

                    if (eventType === "ToolCallStarted") {
                      const tool = data.tool
                      if (tool) {
                        const toolCall: ToolCall = {
                          id: tool.tool_call_id,
                          name: tool.tool_name,
                          status: "running",
                          icon: "settings",
                          args: tool.tool_args,
                        }
                        toolCallsMap.set(tool.tool_call_id, toolCall)

                        updateAssistantInSession(currentSessionId, assistantId, (m) => ({
                          ...m,
                          toolCalls: Array.from(toolCallsMap.values()),
                        }))
                      }
                    } else if (eventType === "ToolCallCompleted") {
                      const tool = data.tool
                      if (tool) {
                        const existingTool = toolCallsMap.get(tool.tool_call_id)
                        if (existingTool) {
                          const updatedTool: ToolCall = {
                            ...existingTool,
                            status: tool.tool_call_error ? "error" : "completed",
                            result: tool.result,
                            duration: tool.metrics?.duration,
                          }
                          toolCallsMap.set(tool.tool_call_id, updatedTool)

                          updateAssistantInSession(currentSessionId, assistantId, (m) => ({
                            ...m,
                            toolCalls: Array.from(toolCallsMap.values()),
                          }))
                        }
                      }
                    } else if (eventType === "RunContent") {
                      if (data.content) {
                        updateAssistantInSession(currentSessionId, assistantId, (m) => ({
                          ...m,
                          content: (m.content || "") + data.content,
                        }))
                      }
                    } else if (eventType === "RunCompleted") {
                      // streamed already
                    }
                  } catch {
                    // ignore malformed json line
                  }
                }
              }
            }
          } finally {
            reader.releaseLock()
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return
        console.error("[v0] Error sending message:", error)

        // 错误消息也要保留，但依然限制 20 条
        const errMsg: Message = {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          content: "I apologize, but I encountered an error processing your request. Please try again.",
          toolCalls: [],
        }
        appendAndTrim(currentSessionId, [errMsg])
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [selectedPatient.sessionId, userId, appendAndTrim, updateAssistantInSession, messagesBySession],
  )

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.condition.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <PatientSidebar
          patients={filteredPatients}
          selectedPatient={selectedPatient}
          onSelectPatient={handleSelectPatient}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNewChat={handleNewChat}
        />
        <ChatPanel
          patient={selectedPatient}
          messages={messages}
          isLoading={isLoading}
          selectedTool={selectedTool}
          onSelectTool={handleSelectTool}
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
        />
        <ToolDetailsPanel tool={selectedTool} />
      </div>
    </div>
  )
}
