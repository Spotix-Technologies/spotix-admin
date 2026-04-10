"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Trash2, Plus, AlertTriangle, Copy, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface RestrictedDate {
  date: string
  isRestricted: boolean
  reason?: string
}

interface RestrictedDay {
  day: string
  isRestricted: boolean
  reason?: string
}

interface GlobalSettings {
  isPayoutAllowed: boolean
  isPayoutNotAllowedReason?: string
  isMaintenance: boolean
  maintenanceReason?: string
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function GlobalsClient() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    isPayoutAllowed: true,
    isMaintenance: false,
  })
  const [restrictedDates, setRestrictedDates] = useState<RestrictedDate[]>([])
  const [restrictedDays, setRestrictedDays] = useState<RestrictedDay[]>([])
  const [newDate, setNewDate] = useState("")
  const [newDateReason, setNewDateReason] = useState("")
  const [maintenanceReason, setMaintenanceReason] = useState("")
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false)
  const [payoutReason, setPayoutReason] = useState("")
  const [showPayoutDialog, setShowPayoutDialog] = useState(false)
  const [copied, setCopied] = useState(false)

  // Fetch global settings on mount
  useEffect(() => {
    fetchGlobalSettings()
  }, [])

  const fetchGlobalSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/v1/admin/global")
      if (!response.ok) throw new Error("Failed to fetch settings")
      const data = await response.json()
      setGlobalSettings(data.globalSettings || { isPayoutAllowed: true, isMaintenance: false })
      setRestrictedDates(data.restrictedDates || [])
      setRestrictedDays(data.restrictedDays || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleAddRestrictedDate = async () => {
    if (!newDate) return

    try {
      const response = await fetch("/api/v1/admin/global/restricted-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newDate,
          isRestricted: true,
          reason: newDateReason,
        }),
      })

      if (!response.ok) throw new Error("Failed to add restricted date")
      setNewDate("")
      setNewDateReason("")
      await fetchGlobalSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleDeleteRestrictedDate = async (date: string) => {
    try {
      const response = await fetch(`/api/v1/admin/global/restricted-date/${date}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete restricted date")
      await fetchGlobalSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleRestrictedDayToggle = async (day: string, isRestricted: boolean) => {
    try {
      const dayObj = restrictedDays.find((d) => d.day === day)
      const response = await fetch("/api/v1/admin/global/restricted-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day,
          isRestricted,
          reason: dayObj?.reason || "",
        }),
      })

      if (!response.ok) throw new Error("Failed to update restricted day")
      await fetchGlobalSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleMaintenanceToggle = async (enabled: boolean) => {
    if (enabled) {
      setShowMaintenanceDialog(true)
    } else {
      // Disable maintenance
      try {
        const response = await fetch("/api/v1/admin/global/maintenance", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isMaintenance: false }),
        })

        if (!response.ok) throw new Error("Failed to disable maintenance")
        await fetchGlobalSettings()
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      }
    }
  }

  const handleConfirmMaintenance = async () => {
    try {
      const response = await fetch("/api/v1/admin/global/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isMaintenance: true,
          maintenanceReason,
        }),
      })

      if (!response.ok) throw new Error("Failed to enable maintenance")
      setShowMaintenanceDialog(false)
      setMaintenanceReason("")
      await fetchGlobalSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setShowMaintenanceDialog(false)
    }
  }

  const handlePayoutAllowToggle = (allowed: boolean) => {
    if (!allowed) {
      // Show dialog to get reason for disabling
      setShowPayoutDialog(true)
    } else {
      // Enable payouts without needing a reason
      submitPayoutChange(true, "")
    }
  }

  const submitPayoutChange = async (allowed: boolean, reason: string) => {
    try {
      const response = await fetch("/api/v1/admin/global/payout-allow", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPayoutAllowed: allowed,
          isPayoutNotAllowedReason: allowed ? "" : reason,
        }),
      })

      if (!response.ok) throw new Error("Failed to update payout settings")
      setPayoutReason("")
      setShowPayoutDialog(false)
      await fetchGlobalSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Loading global settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 pb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Global Settings</h1>
        <p className="text-gray-600 mt-2">Manage platform-wide configurations and restrictions</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Restricted Dates Section */}
      <Card>
        <CardHeader>
          <CardTitle>Restricted Dates</CardTitle>
          <CardDescription>Prevent payouts on specific dates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                placeholder="Select a date"
                className="flex-1"
              />
              <Button onClick={handleAddRestrictedDate} disabled={!newDate} className="bg-[#6b2fa5] hover:bg-[#5a1a8a]">
                <Plus className="w-4 h-4 mr-2" />
                Add Date
              </Button>
            </div>
            <Textarea
              value={newDateReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewDateReason(e.target.value)}
              placeholder="Reason for restriction (optional)"
              className="text-sm"
              rows={2}
            />
          </div>

          {restrictedDates.length > 0 ? (
            <div className="space-y-2 mt-4 pt-4 border-t">
              {restrictedDates.map((rd) => (
                <div key={rd.date} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{new Date(rd.date).toLocaleDateString()}</p>
                    {rd.reason && <p className="text-xs text-gray-600 mt-1">{rd.reason}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRestrictedDate(rd.date)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-4">No restricted dates</p>
          )}
        </CardContent>
      </Card>

      {/* Restricted Days Section */}
      <Card>
        <CardHeader>
          <CardTitle>Restricted Days</CardTitle>
          <CardDescription>Disable payouts on specific days of the week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DAYS_OF_WEEK.map((day) => {
              const dayObj = restrictedDays.find((d) => d.day === day) || { day, isRestricted: false }
              return (
                <div key={day} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <Switch
                      checked={dayObj.isRestricted}
                      onCheckedChange={(checked: boolean) => handleRestrictedDayToggle(day, checked)}
                    />
                    <span className="font-medium text-sm text-gray-900">{day}</span>
                  </div>
                  {dayObj.reason && <p className="text-xs text-gray-600">{dayObj.reason}</p>}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dangerous Section */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <CardTitle className="text-red-900">Dangerous Zone</CardTitle>
          </div>
          <CardDescription className="text-red-800">
            Critical platform operations - handle with care
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Maintenance Toggle */}
          <div className="p-4 border border-red-200 rounded-lg bg-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Maintenance Mode
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {globalSettings.isMaintenance ? "Spotix is currently in maintenance mode" : "Enable maintenance mode"}
                </p>
                {globalSettings.isMaintenance && globalSettings.maintenanceReason && (
                  <p className="text-xs text-gray-700 mt-2 p-2 bg-gray-100 rounded italic">
                    {globalSettings.maintenanceReason}
                  </p>
                )}
              </div>
              <Switch
                checked={globalSettings.isMaintenance}
                onCheckedChange={handleMaintenanceToggle}
                className="ml-2"
              />
            </div>
          </div>

          {/* Payout Allow Toggle */}
          <div className="p-4 border border-red-200 rounded-lg bg-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">Allow Payouts</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {globalSettings.isPayoutAllowed ? "Payouts are currently enabled" : "Payouts are currently disabled"}
                </p>
                {!globalSettings.isPayoutAllowed && globalSettings.isPayoutNotAllowedReason && (
                  <p className="text-xs text-gray-700 mt-2 p-2 bg-gray-100 rounded italic">
                    {globalSettings.isPayoutNotAllowedReason}
                  </p>
                )}
                {!globalSettings.isPayoutAllowed && (
                  <Button
                    onClick={() => handlePayoutAllowToggle(true)}
                    className="mt-2 bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    Enable Payouts
                  </Button>
                )}
              </div>
              {globalSettings.isPayoutAllowed && (
                <Switch
                  checked={globalSettings.isPayoutAllowed}
                  onCheckedChange={handlePayoutAllowToggle}
                  className="ml-2"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Dialog */}
      <Dialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Enable Maintenance Mode
            </DialogTitle>
            <DialogDescription>
              Putting Spotix on maintenance means no user will be able access Spotix. Consult with the CTO before doing
              this.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              This is a critical operation. All users will be blocked from accessing the platform.
            </div>
            <Textarea
              value={maintenanceReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMaintenanceReason(e.target.value)}
              placeholder="Enter the reason for maintenance..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMaintenanceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmMaintenance} className="bg-red-600 hover:bg-red-700" disabled={!maintenanceReason}>
              Confirm & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payout Disable Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Disable Payouts
            </DialogTitle>
            <DialogDescription>
              Disabling payouts will prevent users from requesting withdrawals. A reason is required for this action.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              This action will stop all payout requests from being processed.
            </div>
            <Textarea
              value={payoutReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPayoutReason(e.target.value)}
              placeholder="Enter the reason for disabling payouts..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayoutDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => submitPayoutChange(false, payoutReason)}
              className="bg-red-600 hover:bg-red-700"
              disabled={!payoutReason}
            >
              Confirm & Disable Payouts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
