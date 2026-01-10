import { cookies } from "next/headers"

const SESSION_COOKIE_NAME = "spotix_session"
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5 // 5 days

export async function createSessionCookie(idToken: string) {
  const { adminAuth } = await import("./firebase-admin")

  // Firebase expects milliseconds here
  return adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
  })
}

export async function setSessionCookie(sessionCookie: string) {
  (await cookies()).set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS, // seconds
    path: "/",
  })
}

export async function getSessionCookie() {
  return (await cookies()).get(SESSION_COOKIE_NAME)?.value
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE_NAME)
}

export async function verifySessionCookie(sessionCookie: string) {
  const { adminAuth } = await import("./firebase-admin")
  try {
    return await adminAuth.verifySessionCookie(sessionCookie, true)
  } catch {
    return null
  }
}
