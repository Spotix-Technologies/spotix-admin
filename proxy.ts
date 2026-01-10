import { type NextRequest, NextResponse } from "next/server"

const PUBLIC_PATHS = ["/login", "/unauth", "/api/v1/login"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Allow static files and API routes (except protected ones)
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next()
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get("spotix_session")?.value

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Verify session and check admin status via API
  try {
    const verifyResponse = await fetch(new URL("/api/v1/verify-session", request.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `spotix_session=${sessionCookie}`,
      },
    })

    if (!verifyResponse.ok) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    const data = await verifyResponse.json()

    // If trying to access admin-dashboard but not an admin
    if (pathname.startsWith("/admin-dashboard") && !data.isAdmin) {
      return NextResponse.redirect(new URL("/unauth", request.url))
    }

    // Add user data to headers for downstream use
    const response = NextResponse.next()
    response.headers.set("x-user-uid", data.uid)
    response.headers.set("x-user-username", data.username || "")
    response.headers.set("x-user-fullname", data.fullName || "")
    response.headers.set("x-user-profile-picture", data.profilePicture || "")
    response.headers.set("x-is-admin", String(data.isAdmin))

    return response
  } catch {
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
