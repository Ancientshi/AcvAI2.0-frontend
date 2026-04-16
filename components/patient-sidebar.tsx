"use client"

import { Search, House, SquarePen, MessageCircleQuestion, Users, FileText, GraduationCap, History, PanelLeftClose } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Patient } from "@/lib/types"

interface PatientSidebarProps {
  patients: Patient[]
  selectedPatient: Patient
  onSelectPatient: (patient: Patient) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  onNewChat: () => void
}

export function PatientSidebar({
  patients,
  selectedPatient,
  onSelectPatient,
  searchQuery,
  onSearchChange,
  onNewChat,
}: PatientSidebarProps) {
  return (
    <aside className="flex w-[250px] flex-col border-r border-slate-200 bg-[#f8f9fb]">
      <div className="flex items-center px-4 py-3 text-slate-500">
        <PanelLeftClose className="h-4 w-4" />
      </div>

      <div className="space-y-1 px-4 pb-3">
        <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
          <House className="h-4 w-4" />
          Home
        </button>
        <Button onClick={onNewChat} variant="ghost" className="h-auto w-full justify-start gap-3 px-2 py-2 text-sm text-slate-700 hover:bg-slate-100">
          <SquarePen className="h-4 w-4" />
          New Chat
        </Button>
        <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
          <MessageCircleQuestion className="h-4 w-4" />
          Free Consulting
        </button>
        <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
          <Users className="h-4 w-4" />
          Become a Part...
        </button>
      </div>

      <div className="px-4 py-3 text-xs font-semibold text-slate-500">AI tools</div>
      <div className="space-y-1 px-4 pb-3">
        <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
          <FileText className="h-4 w-4" />
          Resume Polish
        </button>
        <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
          <GraduationCap className="h-4 w-4" />
          University Match
        </button>
      </div>

      <div className="flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Chat History
        </span>
      </div>

      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search history" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="h-9 rounded-lg bg-white pl-9" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Today</div>
        <div className="space-y-1">
          {patients.map((patient) => (
            <button
              key={patient.sessionId}
              onClick={() => onSelectPatient(patient)}
              className={cn(
                "w-full rounded-md px-2 py-2 text-left text-sm transition-colors",
                patient.sessionId === selectedPatient.sessionId
                  ? "bg-slate-200 text-slate-900"
                  : "text-slate-700 hover:bg-slate-100",
              )}
            >
              <div className="truncate">{patient.name}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 px-4 py-4 text-sm text-slate-600">
        <div className="font-semibold">Yunxiao Shi</div>
        <div className="truncate text-slate-500">Ancienshi@gmail.co...</div>
      </div>
    </aside>
  )
}
