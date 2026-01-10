/**
 * Month utility hook for Spotix
 * Converts month numbers (1-12) to month names and provides helper functions
 */

export type MonthNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

const MONTH_ABBREVIATIONS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

export function getMonthName(month: number): string {
  if (month < 1 || month > 12) return "Invalid Month"
  return MONTH_NAMES[month - 1]
}

export function getMonthAbbreviation(month: number): string {
  if (month < 1 || month > 12) return "N/A"
  return MONTH_ABBREVIATIONS[month - 1]
}

export function getMonthNumber(monthName: string): MonthNumber | null {
  const index = MONTH_NAMES.findIndex((name) => name.toLowerCase() === monthName.toLowerCase())
  if (index === -1) {
    const abbrIndex = MONTH_ABBREVIATIONS.findIndex((abbr) => abbr.toLowerCase() === monthName.toLowerCase())
    if (abbrIndex === -1) return null
    return (abbrIndex + 1) as MonthNumber
  }
  return (index + 1) as MonthNumber
}

export function getCurrentMonth(): MonthNumber {
  return (new Date().getMonth() + 1) as MonthNumber
}

export function getCurrentYear(): number {
  return new Date().getFullYear()
}

export function formatMonthYear(month: number, year: number): string {
  return `${getMonthName(month)} ${year}`
}

export function parseMonthString(monthString: string): { year: number; month: number } | null {
  // Format: "YYYY-MM"
  const parts = monthString.split("-")
  if (parts.length !== 2) return null
  const year = Number.parseInt(parts[0], 10)
  const month = Number.parseInt(parts[1], 10)
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return null
  return { year, month }
}

export function parseDayString(dayString: string): { year: number; month: number; day: number } | null {
  // Format: "YYYY-MM-DD"
  const parts = dayString.split("-")
  if (parts.length !== 3) return null
  const year = Number.parseInt(parts[0], 10)
  const month = Number.parseInt(parts[1], 10)
  const day = Number.parseInt(parts[2], 10)
  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) return null
  return { year, month, day }
}

export function getAllMonths(): { number: MonthNumber; name: string; abbreviation: string }[] {
  return MONTH_NAMES.map((name, index) => ({
    number: (index + 1) as MonthNumber,
    name,
    abbreviation: MONTH_ABBREVIATIONS[index],
  }))
}

export function useMonth() {
  return {
    getMonthName,
    getMonthAbbreviation,
    getMonthNumber,
    getCurrentMonth,
    getCurrentYear,
    formatMonthYear,
    parseMonthString,
    parseDayString,
    getAllMonths,
    MONTH_NAMES,
    MONTH_ABBREVIATIONS,
  }
}
