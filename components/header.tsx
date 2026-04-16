"use client"

import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="text-[34px] font-semibold tracking-tight text-slate-900">ACHIEVA AI</div>

      <nav className="flex items-center gap-3 text-base">
        <Button variant="ghost" className="text-[#2153ff] hover:bg-blue-50 hover:text-[#1b46df]">
          Home
        </Button>
        <Button variant="ghost" className="text-[#2153ff] hover:bg-blue-50 hover:text-[#1b46df]">
          Free Consulting
        </Button>
        <Button variant="ghost" className="text-[#2153ff] hover:bg-blue-50 hover:text-[#1b46df]">
          Become a Partner
        </Button>
        <Button variant="outline" className="ml-1 gap-2 rounded-lg border-slate-200 bg-white px-3 text-slate-800 hover:bg-slate-50">
          <Globe className="h-4 w-4" />
          English
        </Button>
      </nav>
    </header>
  )
}
