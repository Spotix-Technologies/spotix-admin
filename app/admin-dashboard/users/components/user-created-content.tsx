// app/admin-dashboard/users/components/user-created-content.tsx
//
// "Created Content" tab on the Users admin page — everything this user
// has created on Spotix: events they organize, polls they've built
// (voting / nominations / elections), and merch they've listed.

"use client"

import { useState } from "react"
import Link from "next/link"
import {
  AlertCircle, CalendarDays, Vote, ShoppingBag, ChevronRight,
  ImageIcon, Trophy, Megaphone, Award,
} from "lucide-react"

export interface UserEventSummary {
  eventId: string
  eventName: string
  eventImage: string
  status: string
}

export interface UserVotingPoll {
  pollId: string
  pollName: string
  pollImage: string
  pollType: "single" | "group"
  status: string
}

export interface UserNominationPoll {
  pollId: string
  pollName: string
  pollImage: string
  status: "active" | "closed"
  categoryCount: number
}

export interface UserElection {
  electionId: string
  name: string
  image: string
  status: "draft" | "scheduled" | "active" | "ended"
  resultsPublished: boolean
  votingStartsAt: string | null
  votingEndsAt: string | null
}

interface Props {
  events: UserEventSummary[]
  loadingEvents: boolean
  eventsError: string | null

  voting: UserVotingPoll[]
  votingError: string | null
  nominations: UserNominationPoll[]
  nominationsError: string | null
  elections: UserElection[]
  electionsError: string | null
  loadingPolls: boolean

  merch: MerchListingSummary[]
  loadingMerch: boolean
  merchError: string | null
}

export interface MerchListingSummary {
  id: string
  productName: string
  images: string[]
  price: number
  status: "active" | "inactive"
}

const STATUS_PILL: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-100 text-slate-500 border-slate-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
  closed: "bg-slate-100 text-slate-500 border-slate-200",
  draft: "bg-slate-100 text-slate-500 border-slate-200",
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  ended: "bg-slate-100 text-slate-500 border-slate-200",
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_PILL[status] || STATUS_PILL.active}`}>
      {status}
    </span>
  )
}

function Thumb({ src, alt, fallback }: { src?: string; alt: string; fallback: React.ReactNode }) {
  return (
    <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center">
      {src ? <img src={src} alt={alt} className="w-full h-full object-cover" /> : fallback}
    </div>
  )
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  )
}

function ErrorRow({ message }: { message: string }) {
  return (
    <div className="px-5 py-6">
      <div className="flex items-start gap-2.5 text-sm text-red-600">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{message}</span>
      </div>
    </div>
  )
}

function LoadingRows() {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
          <div className="w-11 h-11 rounded-lg bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-slate-100 rounded w-2/3" />
            <div className="h-3 bg-slate-100 rounded w-1/3" />
          </div>
          <div className="w-14 h-5 bg-slate-100 rounded-full" />
        </div>
      ))}
    </div>
  )
}

type MainTab = "events" | "polls" | "merch"
type PollSubTab = "voting" | "nominations" | "elections"

export function UserCreatedContentComponent(props: Props) {
  const [mainTab, setMainTab] = useState<MainTab>("events")
  const [pollSubTab, setPollSubTab] = useState<PollSubTab>("voting")

  const {
    events, loadingEvents, eventsError,
    voting, votingError, nominations, nominationsError, elections, electionsError, loadingPolls,
    merch, loadingMerch, merchError,
  } = props

  return (
    <div className="space-y-4">
      {/* Main sub-nav */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit flex-wrap">
        <button
          onClick={() => setMainTab("events")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
            mainTab === "events" ? "bg-white text-[#6b2fa5] shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          Events
          <span className="text-[10px] bg-[#6b2fa5]/10 text-[#6b2fa5] px-1.5 py-0.5 rounded-full font-bold">
            {events.length}
          </span>
        </button>
        <button
          onClick={() => setMainTab("polls")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
            mainTab === "polls" ? "bg-white text-[#6b2fa5] shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Vote className="w-3.5 h-3.5" />
          Polls
          <span className="text-[10px] bg-[#6b2fa5]/10 text-[#6b2fa5] px-1.5 py-0.5 rounded-full font-bold">
            {voting.length + nominations.length + elections.length}
          </span>
        </button>
        <button
          onClick={() => setMainTab("merch")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
            mainTab === "merch" ? "bg-white text-[#6b2fa5] shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Merch
          <span className="text-[10px] bg-[#6b2fa5]/10 text-[#6b2fa5] px-1.5 py-0.5 rounded-full font-bold">
            {merch.length}
          </span>
        </button>
      </div>

      {/* Events */}
      {mainTab === "events" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {loadingEvents ? (
            <LoadingRows />
          ) : eventsError ? (
            <ErrorRow message={eventsError} />
          ) : events.length === 0 ? (
            <EmptyRow label="No events organized by this user" />
          ) : (
            <div className="divide-y divide-slate-100">
              {events.map((ev) => (
                <div key={ev.eventId} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <Thumb src={ev.eventImage} alt={ev.eventName} fallback={<span className="text-lg">🎪</span>} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{ev.eventName}</p>
                    <p className="text-xs text-slate-400 font-mono truncate mt-0.5">{ev.eventId}</p>
                  </div>
                  <StatusBadge status={ev.status} />
                  <Link
                    href={`/admin-dashboard/event-data?eventId=${encodeURIComponent(ev.eventId)}`}
                    className="shrink-0 flex items-center gap-1 text-xs font-semibold text-[#6b2fa5] hover:bg-[#6b2fa5]/10 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    View details
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Polls */}
      {mainTab === "polls" && (
        <div className="space-y-3">
          <div className="flex gap-1 p-1 bg-slate-50 border border-slate-200 rounded-xl w-fit flex-wrap">
            <button
              onClick={() => setPollSubTab("voting")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                pollSubTab === "voting" ? "bg-white text-[#6b2fa5] shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Voting
              <span className="text-[10px] text-slate-400">{voting.length}</span>
            </button>
            <button
              onClick={() => setPollSubTab("nominations")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                pollSubTab === "nominations" ? "bg-white text-[#6b2fa5] shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              Nominations
              <span className="text-[10px] text-slate-400">{nominations.length}</span>
            </button>
            <button
              onClick={() => setPollSubTab("elections")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                pollSubTab === "elections" ? "bg-white text-[#6b2fa5] shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Elections
              <span className="text-[10px] text-slate-400">{elections.length}</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {pollSubTab === "voting" && (
              loadingPolls ? <LoadingRows /> :
              votingError ? <ErrorRow message={votingError} /> :
              voting.length === 0 ? <EmptyRow label="No voting polls created by this user" /> : (
                <div className="divide-y divide-slate-100">
                  {voting.map((p) => (
                    <div key={p.pollId} className="flex items-center gap-3 px-5 py-4">
                      <Thumb src={p.pollImage} alt={p.pollName} fallback={<ImageIcon className="w-4 h-4 text-slate-300" />} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{p.pollName}</p>
                        <p className="text-xs text-slate-400 font-mono truncate mt-0.5">{p.pollId}</p>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-[#6b2fa5]/10 text-[#6b2fa5] border-[#6b2fa5]/20 capitalize">
                        {p.pollType}
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                  ))}
                </div>
              )
            )}

            {pollSubTab === "nominations" && (
              loadingPolls ? <LoadingRows /> :
              nominationsError ? <ErrorRow message={nominationsError} /> :
              nominations.length === 0 ? <EmptyRow label="No nomination polls created by this user" /> : (
                <div className="divide-y divide-slate-100">
                  {nominations.map((p) => (
                    <div key={p.pollId} className="flex items-center gap-3 px-5 py-4">
                      <Thumb src={p.pollImage} alt={p.pollName} fallback={<ImageIcon className="w-4 h-4 text-slate-300" />} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{p.pollName}</p>
                        <p className="text-xs text-slate-400 font-mono truncate mt-0.5">{p.pollId}</p>
                      </div>
                      <span className="shrink-0 text-[10px] text-slate-500">
                        {p.categoryCount} {p.categoryCount === 1 ? "category" : "categories"}
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                  ))}
                </div>
              )
            )}

            {pollSubTab === "elections" && (
              loadingPolls ? <LoadingRows /> :
              electionsError ? <ErrorRow message={electionsError} /> :
              elections.length === 0 ? <EmptyRow label="No elections created by this user" /> : (
                <div className="divide-y divide-slate-100">
                  {elections.map((e) => (
                    <div key={e.electionId} className="flex items-center gap-3 px-5 py-4">
                      <Thumb src={e.image} alt={e.name} fallback={<Award className="w-4 h-4 text-slate-300" />} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{e.name}</p>
                        <p className="text-xs text-slate-400 font-mono truncate mt-0.5">{e.electionId}</p>
                      </div>
                      {e.resultsPublished && (
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-[#6b2fa5]/10 text-[#6b2fa5] border-[#6b2fa5]/20">
                          Published
                        </span>
                      )}
                      <StatusBadge status={e.status} />
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Merch */}
      {mainTab === "merch" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {loadingMerch ? (
            <LoadingRows />
          ) : merchError ? (
            <ErrorRow message={merchError} />
          ) : merch.length === 0 ? (
            <EmptyRow label="No merch listed by this user" />
          ) : (
            <div className="divide-y divide-slate-100">
              {merch.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <Thumb src={m.images?.[0]} alt={m.productName} fallback={<ShoppingBag className="w-4 h-4 text-slate-300" />} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{m.productName}</p>
                    <p className="text-xs text-slate-400 font-mono truncate mt-0.5">{m.id}</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 shrink-0">
                    ₦{(m.price || 0).toLocaleString()}
                  </span>
                  <StatusBadge status={m.status} />
                  <Link
                    href={`/admin-dashboard/merch/${encodeURIComponent(m.id)}`}
                    className="shrink-0 flex items-center gap-1 text-xs font-semibold text-[#6b2fa5] hover:bg-[#6b2fa5]/10 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    View details
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
