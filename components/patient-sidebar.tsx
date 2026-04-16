"use client"

import { Search, Plus } from "lucide-react"
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
    <aside className="flex w-80 flex-col border-r border-slate-200 bg-white">
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Patient History & Consults</h2>
          <Button onClick={onNewChat} size="sm" className="bg-sky-500 hover:bg-sky-600">
            <Plus className="mr-1 h-4 w-4" />
            New
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-2">
          {patients.map((patient) => (
            <button
              key={patient.sessionId}
              onClick={() => onSelectPatient(patient)}
              className={cn(
                "w-full rounded-lg p-3 text-left transition-colors",
                patient.sessionId === selectedPatient.sessionId
                  ? "bg-sky-500 text-white"
                  : "bg-slate-50 text-slate-900 hover:bg-slate-100",
              )}
            >
              {patient.sessionId === selectedPatient.sessionId && (
                <span className="text-xs font-medium text-sky-100">Active:</span>
              )}
              <div className="font-medium">{patient.name}</div>
              <div
                className={cn(
                  "text-sm",
                  patient.sessionId === selectedPatient.sessionId ? "text-sky-100" : "text-slate-500",
                )}
              >
                ({patient.condition}) - {patient.date}
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
