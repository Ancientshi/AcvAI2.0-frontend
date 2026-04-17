"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ToolCall } from "@/lib/types"
import { MarkdownRenderer } from "./markdown-renderer"
import { CheckCircle, Loader2, AlertCircle, Copy, Check } from "lucide-react"
import { useState } from "react"

interface ToolDetailsPanelProps {
  tool: ToolCall | null
  width?: number
}

export function ToolDetailsPanel({ tool, width = 320 }: ToolDetailsPanelProps) {
  const [copied, setCopied] = useState(false)

  const parseAsJson = (value: string): unknown | null => {
    const trimmed = value.trim()
    if (!trimmed) return null

    const tryParse = (input: string) => {
      try {
        return JSON.parse(input)
      } catch {
        return null
      }
    }

    const direct = tryParse(trimmed)
    if (direct !== null) {
      if (typeof direct === "string") {
        const nested = tryParse(direct)
        if (nested !== null) return nested
      }
      return direct
    }

    return null
  }

  const handleCopy = () => {
    if (tool?.result) {
      navigator.clipboard.writeText(tool.result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!tool) {
    return (
      <aside style={{ width }} className="border-l border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Details</h2>
        <div className="flex h-64 items-center justify-center text-center text-sm text-slate-400">
          Click one item in the details card to view tool output.
        </div>
      </aside>
    )
  }

  const statusIcon = {
    running: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
    completed: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    pending: <Loader2 className="h-5 w-5 text-slate-400" />,
    active: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
  }

  const parsedResult = tool.result ? parseAsJson(tool.result) : null
  const hasJsonResult = parsedResult !== null

  return (
    <aside style={{ width }} className="flex flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-slate-900">Details</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Tool Name and Status */}
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-900">{tool.name}</h3>
              {statusIcon[tool.status]}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  tool.status === "completed"
                    ? "bg-green-100 text-green-700"
                    : tool.status === "error"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                }`}
              >
                {tool.status.charAt(0).toUpperCase() + tool.status.slice(1)}
              </span>
              {tool.duration && <span>• {tool.duration.toFixed(2)}s</span>}
            </div>
          </div>

          {/* Tool Arguments */}
          {tool.args && Object.keys(tool.args).length > 0 && (
            <div className="rounded-lg border border-slate-200 p-4">
              <h4 className="font-medium text-slate-700 mb-2">Input Arguments</h4>
              <div className="bg-slate-50 rounded-lg p-3 overflow-x-auto">
                <pre className="text-xs font-mono text-slate-600 whitespace-pre-wrap">
                  {JSON.stringify(tool.args, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Tool Result */}
          {tool.result && (
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-slate-700">Result {hasJsonResult ? "(JSON)" : ""}</h4>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 max-h-96 overflow-y-auto">
                {hasJsonResult ? (
                  <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-words">
                    {JSON.stringify(parsedResult, null, 2)}
                  </pre>
                ) : (
                  <MarkdownRenderer content={tool.result} className="text-sm" />
                )}
              </div>
            </div>
          )}

          {/* Running state */}
          {tool.status === "running" && (
            <div className="rounded-lg bg-blue-50 p-4 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-blue-700">Tool is executing...</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {tool.result && (
        <div className="border-t border-slate-200 p-4">
          <Button variant="outline" className="w-full bg-transparent" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy Full Result"}
          </Button>
        </div>
      )}
    </aside>
  )
}
