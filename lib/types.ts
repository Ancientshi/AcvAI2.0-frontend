export interface Patient {
  id: string
  name: string
  condition: string
  date: string
  isActive: boolean
  sessionId: string
}

export interface ToolCall {
  id: string
  name: string
  status: "pending" | "running" | "active" | "completed" | "error"
  icon: string
  confidence?: number
  input?: unknown
  output?: string
  args?: Record<string, unknown>
  result?: string
  duration?: number
}

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  toolCalls?: ToolCall[]
}

export interface ToolDetail {
  title: string
  source: string
  content: string
  pdfUrl?: string
}

export interface SSERunStarted {
  event: "RunStarted"
  agent_id: string
  agent_name: string
  run_id: string
  session_id: string
  model: string
  model_provider: string
}

export interface SSEToolCallStarted {
  event: "ToolCallStarted"
  agent_id: string
  run_id: string
  session_id: string
  tool: {
    tool_call_id: string
    tool_name: string
    tool_args: Record<string, unknown>
  }
}

export interface SSEToolCallCompleted {
  event: "ToolCallCompleted"
  agent_id: string
  run_id: string
  session_id: string
  content: string
  tool: {
    tool_call_id: string
    tool_name: string
    tool_args: Record<string, unknown>
    tool_call_error: boolean
    result: string
    metrics?: {
      duration: number
    }
  }
}

export interface SSERunContent {
  event: "RunContent"
  content: string
  reasoning_content?: string
}

export interface SSERunCompleted {
  event: "RunCompleted"
  content: string
  metrics?: {
    input_tokens: number
    output_tokens: number
    total_tokens: number
    duration: number
  }
}

export type SSEEvent = SSERunStarted | SSEToolCallStarted | SSEToolCallCompleted | SSERunContent | SSERunCompleted
