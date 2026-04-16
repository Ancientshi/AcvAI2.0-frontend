"use client"

import type React from "react"

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const renderMarkdown = (text: string): React.ReactNode[] => {
    const lines = text.split("\n")
    const elements: React.ReactNode[] = []
    let i = 0

    let listItems: string[] = []
    let listType: "ul" | "ol" | null = null

    let inCodeBlock = false
    let codeBlockContent: string[] = []
    let codeBlockLang = ""

    const isUl = (s: string) => /^[\s]*[-*•]\s+/.test(s)
    const isOl = (s: string) => /^[\s]*\d+[.)]\s+/.test(s)

    const peekNextNonEmptyLine = (from: number) => {
      let j = from
      while (j < lines.length && lines[j].trim() === "") j++
      return j < lines.length ? lines[j] : null
    }

    const flushList = () => {
      if (listItems.length > 0 && listType) {
        const ListTag = listType
        elements.push(
          <ListTag
            key={`list-${i}`}
            className={listType === "ul" ? "list-disc pl-6 my-2 space-y-1" : "list-decimal pl-6 my-2 space-y-2"}
          >
            {listItems.map((item, idx) => (
              <li key={idx} className="text-slate-700">
                {renderInline(item)}
              </li>
            ))}
          </ListTag>,
        )
        listItems = []
        listType = null
      }
    }

    const renderInline = (text: string): React.ReactNode => {
      const parts: React.ReactNode[] = []
      let remaining = text
      let key = 0

      while (remaining.length > 0) {
        const codeMatch = remaining.match(/`([^`]+)`/)
        const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
        // italic 先做一个更保守的：避免吃掉 **bold**
        const italicMatch = remaining.match(/(^|[^*])\*([^*]+)\*(?!\*)/)
        const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/)

        const matches = [
          { match: codeMatch, type: "code" as const },
          { match: boldMatch, type: "bold" as const },
          { match: italicMatch, type: "italic" as const },
          { match: linkMatch, type: "link" as const },
        ]
          .filter((m) => m.match !== null)
          .sort((a, b) => (a.match?.index ?? Number.POSITIVE_INFINITY) - (b.match?.index ?? Number.POSITIVE_INFINITY))

        if (matches.length === 0) {
          parts.push(remaining)
          break
        }

        const first = matches[0]
        const match = first.match!
        const index = match.index ?? 0

        if (index > 0) parts.push(remaining.slice(0, index))

        switch (first.type) {
          case "code":
            parts.push(
              <code key={key++} className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-sky-700">
                {match[1]}
              </code>,
            )
            break
          case "bold":
            parts.push(
              <strong key={key++} className="font-semibold">
                {match[1]}
              </strong>,
            )
            break
          case "italic":
            // italicMatch 有个前导捕获组
            parts.push(match[1] ?? "")
            parts.push(
              <em key={key++} className="italic">
                {match[2]}
              </em>,
            )
            break
          case "link":
            parts.push(
              <a
                key={key++}
                href={match[2]}
                className="text-sky-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {match[1]}
              </a>,
            )
            break
        }

        remaining = remaining.slice(index + match[0].length)
      }

      return parts.length === 1 ? parts[0] : <>{parts}</>
    }

    while (i < lines.length) {
      const line = lines[i]

      // Code block start/end
      if (line.startsWith("```")) {
        if (!inCodeBlock) {
          flushList()
          inCodeBlock = true
          codeBlockLang = line.slice(3).trim()
          codeBlockContent = []
        } else {
          elements.push(
            <pre key={`code-${i}`} className="bg-slate-900 text-slate-100 p-4 rounded-lg my-3 overflow-x-auto">
              <code className="text-sm font-mono">{codeBlockContent.join("\n")}</code>
            </pre>,
          )
          inCodeBlock = false
          codeBlockContent = []
          codeBlockLang = ""
        }
        i++
        continue
      }

      if (inCodeBlock) {
        codeBlockContent.push(line)
        i++
        continue
      }

      // Headers
      if (line.startsWith("### ")) {
        flushList()
        elements.push(
          <h3 key={`h3-${i}`} className="text-lg font-semibold text-slate-900 mt-4 mb-2">
            {renderInline(line.slice(4))}
          </h3>,
        )
        i++
        continue
      }
      if (line.startsWith("## ")) {
        flushList()
        elements.push(
          <h2 key={`h2-${i}`} className="text-xl font-semibold text-slate-900 mt-5 mb-2">
            {renderInline(line.slice(3))}
          </h2>,
        )
        i++
        continue
      }
      if (line.startsWith("# ")) {
        flushList()
        elements.push(
          <h1 key={`h1-${i}`} className="text-2xl font-bold text-slate-900 mt-6 mb-3">
            {renderInline(line.slice(2))}
          </h1>,
        )
        i++
        continue
      }

      // Horizontal rule
      if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) {
        flushList()
        elements.push(<hr key={`hr-${i}`} className="border-slate-200 my-4" />)
        i++
        continue
      }

      // List continuation line (缩进续行，拼到上一条 li)
      if (listType && listItems.length > 0 && /^\s{2,}\S+/.test(line) && !isUl(line) && !isOl(line)) {
        listItems[listItems.length - 1] += " " + line.trim()
        i++
        continue
      }

      // Unordered list
      if (isUl(line)) {
        if (listType !== "ul") {
          flushList()
          listType = "ul"
        }
        listItems.push(line.replace(/^[\s]*[-*•]\s+/, ""))
        i++
        continue
      }

      // Ordered list
      if (isOl(line)) {
        if (listType !== "ol") {
          flushList()
          listType = "ol"
        }
        listItems.push(line.replace(/^[\s]*\d+[.)]\s+/, ""))
        i++
        continue
      }

      // Blockquote
      if (line.startsWith("> ")) {
        flushList()
        elements.push(
          <blockquote key={`quote-${i}`} className="border-l-4 border-sky-300 pl-4 py-1 my-2 text-slate-600 italic">
            {renderInline(line.slice(2))}
          </blockquote>,
        )
        i++
        continue
      }

      // Table detection（原样保留）
      if (line.includes("|") && lines[i + 1]?.match(/^\|?[\s-:|]+\|?$/)) {
        flushList()
        const tableLines: string[] = [line]
        let j = i + 1
        while (j < lines.length && lines[j].includes("|")) {
          tableLines.push(lines[j])
          j++
        }

        const parseRow = (row: string) =>
          row
            .split("|")
            .map((cell) => cell.trim())
            .filter((cell) => cell.length > 0)

        const headers = parseRow(tableLines[0])
        const dataRows = tableLines.slice(2).map(parseRow)

        elements.push(
          <div key={`table-${i}`} className="my-4 overflow-x-auto">
            <table className="min-w-full border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100">
                <tr>
                  {headers.map((header, idx) => (
                    <th
                      key={idx}
                      className="px-4 py-2 text-left text-sm font-semibold text-slate-700 border-b border-slate-200"
                    >
                      {renderInline(header)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-4 py-2 text-sm text-slate-700 border-b border-slate-200">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        )
        i = j
        continue
      }

      // Empty line：关键修复——如果 list 还在继续，就不要 flush
      if (line.trim() === "") {
        if (listType) {
          const next = peekNextNonEmptyLine(i + 1)
          const continues =
            next && ((listType === "ol" && isOl(next)) || (listType === "ul" && isUl(next)))
          if (continues) {
            i++
            continue
          }
        }
        flushList()
        i++
        continue
      }

      // Regular paragraph
      flushList()
      elements.push(
        <p key={`p-${i}`} className="text-slate-700 my-2 leading-relaxed">
          {renderInline(line)}
        </p>,
      )
      i++
    }

    flushList()
    return elements
  }

  return <div className={`markdown-content ${className}`}>{renderMarkdown(content)}</div>
}
