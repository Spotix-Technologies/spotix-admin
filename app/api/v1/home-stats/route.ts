import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface AnalyticsData {
  ticketsSold?: number
  totalRevenue?: number
  usersSignedUp?: number
  totalTransactionFees?: number
  payout?: number
  payoutCount?: number
  lastUpdated?: any
}

interface MonthlyData extends AnalyticsData {
  month: string
}

interface DailyData extends AnalyticsData {
  day: string
}

function getPreviousMonth(currentMonth: string): string {
  const [year, month] = currentMonth.split("-").map(Number)
  if (month === 1) {
    return `${year - 1}-12`
  }
  return `${year}-${String(month - 1).padStart(2, "0")}`
}

function getPreviousDays(currentDay: string, count: number): string[] {
  const days: string[] = []
  const date = new Date(currentDay)
  for (let i = 1; i <= count; i++) {
    const prevDate = new Date(date)
    prevDate.setDate(date.getDate() - i)
    const dayStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-${String(prevDate.getDate()).padStart(2, "0")}`
    days.push(dayStr)
  }
  return days
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) {
      return adminResult.error
    }

    const now = new Date()
    const nigerianTime = new Date(now.getTime() + 60 * 60 * 1000)
    const currentYear = nigerianTime.getUTCFullYear().toString()
    const previousYear = (nigerianTime.getUTCFullYear() - 1).toString()
    const currentMonth = `${nigerianTime.getUTCFullYear()}-${String(nigerianTime.getUTCMonth() + 1).padStart(2, "0")}`
    const previousMonth = getPreviousMonth(currentMonth)
    const currentDay = `${nigerianTime.getUTCFullYear()}-${String(nigerianTime.getUTCMonth() + 1).padStart(2, "0")}-${String(nigerianTime.getUTCDate()).padStart(2, "0")}`

    const previousDays = getPreviousDays(currentDay, 7)

    // Fetch yearly stats
    const yearlyRef = adminDb.collection("admin").doc("analytics").collection("yearly").doc(currentYear)
    const yearlyDoc = await yearlyRef.get()
    const yearlyData: AnalyticsData = yearlyDoc.exists ? (yearlyDoc.data() as AnalyticsData) : {}

    const prevYearlyRef = adminDb.collection("admin").doc("analytics").collection("yearly").doc(previousYear)
    const prevYearlyDoc = await prevYearlyRef.get()
    const prevYearlyData: AnalyticsData = prevYearlyDoc.exists ? (prevYearlyDoc.data() as AnalyticsData) : {}

    // Fetch all monthly stats for current year
    const monthlyRef = adminDb.collection("admin").doc("analytics").collection("monthly")
    const monthlySnapshot = await monthlyRef
      .where("__name__", ">=", `${currentYear}-01`)
      .where("__name__", "<=", `${currentYear}-12`)
      .get()

    const monthlyData: MonthlyData[] = []
    monthlySnapshot.forEach((doc) => {
      monthlyData.push({
        month: doc.id,
        ...(doc.data() as AnalyticsData),
      })
    })

    monthlyData.sort((a, b) => a.month.localeCompare(b.month))

    // Fetch daily stats for current month
    const dailyRef = adminDb.collection("admin").doc("analytics").collection("daily")
    const dailySnapshot = await dailyRef
      .where("__name__", ">=", `${currentYear}-${String(nigerianTime.getUTCMonth() + 1).padStart(2, "0")}-01`)
      .where("__name__", "<=", currentDay)
      .get()

    const dailyData: DailyData[] = []
    dailySnapshot.forEach((doc) => {
      dailyData.push({
        day: doc.id,
        ...(doc.data() as AnalyticsData),
      })
    })

    dailyData.sort((a, b) => a.day.localeCompare(b.day))

    // Get today's stats
    const todayRef = adminDb.collection("admin").doc("analytics").collection("daily").doc(currentDay)
    const todayDoc = await todayRef.get()
    const todayData: AnalyticsData = todayDoc.exists ? (todayDoc.data() as AnalyticsData) : {}

    // Get current month stats
    const currentMonthRef = adminDb.collection("admin").doc("analytics").collection("monthly").doc(currentMonth)
    const currentMonthDoc = await currentMonthRef.get()
    const currentMonthData: AnalyticsData = currentMonthDoc.exists ? (currentMonthDoc.data() as AnalyticsData) : {}

    const prevMonthRef = adminDb.collection("admin").doc("analytics").collection("monthly").doc(previousMonth)
    const prevMonthDoc = await prevMonthRef.get()
    const prevMonthData: AnalyticsData = prevMonthDoc.exists ? (prevMonthDoc.data() as AnalyticsData) : {}

    const previousDaysData: DailyData[] = []
    for (const dayStr of previousDays) {
      const dayRef = adminDb.collection("admin").doc("analytics").collection("daily").doc(dayStr)
      const dayDoc = await dayRef.get()
      if (dayDoc.exists) {
        previousDaysData.push({
          day: dayStr,
          ...(dayDoc.data() as AnalyticsData),
        })
      } else {
        previousDaysData.push({
          day: dayStr,
          ticketsSold: 0,
          totalRevenue: 0,
          usersSignedUp: 0,
          totalTransactionFees: 0,
          payout: 0,
          payoutCount: 0,
        })
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          year: currentYear,
          previousYear,
          currentMonth,
          previousMonth,
          currentDay,
          yearly: {
            ticketsSold: yearlyData.ticketsSold || 0,
            totalRevenue: yearlyData.totalRevenue || 0,
            usersSignedUp: yearlyData.usersSignedUp || 0,
            totalTransactionFees: yearlyData.totalTransactionFees || 0,
            payout: yearlyData.payout || 0,
            payoutCount: yearlyData.payoutCount || 0,
          },
          previousYearly: {
            ticketsSold: prevYearlyData.ticketsSold || 0,
            totalRevenue: prevYearlyData.totalRevenue || 0,
            usersSignedUp: prevYearlyData.usersSignedUp || 0,
            totalTransactionFees: prevYearlyData.totalTransactionFees || 0,
            payout: prevYearlyData.payout || 0,
            payoutCount: prevYearlyData.payoutCount || 0,
          },
          monthly: {
            current: {
              ticketsSold: currentMonthData.ticketsSold || 0,
              totalRevenue: currentMonthData.totalRevenue || 0,
              usersSignedUp: currentMonthData.usersSignedUp || 0,
              totalTransactionFees: currentMonthData.totalTransactionFees || 0,
              payout: currentMonthData.payout || 0,
              payoutCount: currentMonthData.payoutCount || 0,
            },
            previous: {
              ticketsSold: prevMonthData.ticketsSold || 0,
              totalRevenue: prevMonthData.totalRevenue || 0,
              usersSignedUp: prevMonthData.usersSignedUp || 0,
              totalTransactionFees: prevMonthData.totalTransactionFees || 0,
              payout: prevMonthData.payout || 0,
              payoutCount: prevMonthData.payoutCount || 0,
            },
            all: monthlyData,
          },
          daily: {
            today: {
              ticketsSold: todayData.ticketsSold || 0,
              totalRevenue: todayData.totalRevenue || 0,
              usersSignedUp: todayData.usersSignedUp || 0,
              totalTransactionFees: todayData.totalTransactionFees || 0,
              payout: todayData.payout || 0,
              payoutCount: todayData.payoutCount || 0,
            },
            previousDays: previousDaysData,
            all: dailyData,
          },
        },
        developer: "API developed and maintained by Spotix Technologies",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error fetching home stats:", error)

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to fetch analytics data",
        details: error instanceof Error ? error.message : "Unknown error",
        developer: "API developed and maintained by Spotix Technologies",
      },
      { status: 500 },
    )
  }
}
