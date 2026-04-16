export const runtime = "nodejs"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:2104"
const AGENT_ID = "DermAgent_v1"

function randomId(prefix: string) {
  // node runtime 可以用 crypto.randomUUID
  return `${prefix}_${crypto.randomUUID()}`
}

export async function POST(request: Request) {
  try {
    const incoming = await request.formData()

    // 重新构造一份 FormData（更稳：可修改/可兜底字段）
    const forward = new FormData()
    for (const [k, v] of incoming.entries()) forward.append(k, v)

    // 兜底：保证必要字段存在
    if (!forward.get("stream")) forward.set("stream", "true")
    if (!forward.get("session_id")) forward.set("session_id", randomId("sess"))
    if (!forward.get("user_id")) forward.set("user_id", randomId("user"))

    const upstream = await fetch(`${API_BASE_URL}/agents/${AGENT_ID}/runs`, {
      method: "POST",
      headers: {
        // 关键：SSE 场景建议用这个，而不是 application/json
        accept: "text/event-stream",
        "ngrok-skip-browser-warning": "true",
      },
      body: forward,
    })

    if (!upstream.ok) {
      const errorText = await upstream.text()
      console.error("[v0] Backend error:", upstream.status, errorText)
      return new Response(JSON.stringify({ error: errorText }), {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!upstream.body) {
      return new Response(JSON.stringify({ error: "No upstream response body" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 直接透传上游 SSE body（最稳）
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("[v0] Proxy error:", error)
    return new Response(JSON.stringify({ error: "Proxy error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
