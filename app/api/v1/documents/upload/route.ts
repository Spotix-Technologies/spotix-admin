/**
 * app/api/v1/documents/upload/route.ts
 *
 * POST /api/v1/documents/upload
 *   multipart/form-data: { file: File }
 *   → Uploads the file to UploadThing (server-side, via UTApi) and returns
 *     its hosted URL + storage key.
 *
 * All exec-assistant document/image uploads go through UploadThing instead
 * of Firebase Storage so files are served from a single, shareable CDN.
 *
 * Access: exec-assistant only
 */
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"

const TAG = "[/api/v1/documents/upload]"

function ok(data: object) {
  return NextResponse.json({ success: true, ...data }, { status: 200 })
}
function fail(message: string, status = 500) {
  console.error(`${TAG} ${status}: ${message}`)
  return NextResponse.json({ success: false, error: message }, { status })
}

const MAX_SIZE = 20 * 1024 * 1024 // 20MB, matches client-side limit

async function uploadToUploadThing(file: File): Promise<{ url: string; key: string } | null> {
  const token = process.env.UPLOADTHING_TOKEN
  const secret = process.env.UPLOADTHING_SECRET
  if (!token && !secret) {
    console.warn(`${TAG} No UPLOADTHING_TOKEN or UPLOADTHING_SECRET set — cannot upload`)
    return null
  }

  let UTApi: any
  try {
    const mod = await import("uploadthing/server")
    UTApi = mod.UTApi
  } catch {
    console.warn(`${TAG} 'uploadthing' package not installed — run: npm install uploadthing`)
    return null
  }

  const utapi = new UTApi({ token: token ?? secret })
  const result = await utapi.uploadFiles(file)
  if (result.error) {
    console.error(`${TAG} UploadThing error:`, result.error)
    return null
  }

  const url: string | undefined = result.data?.url ?? result.data?.ufsUrl
  const key: string | undefined = result.data?.key
  if (!url || !key) return null
  return { url, key }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAccess(req, ["exec-assistant"])
  if ("error" in auth) return auth.error

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return fail("Could not parse form data", 400)
  }

  const raw = formData.get("file")
  if (!raw || !(raw instanceof File)) {
    return fail("No 'file' field in request body", 400)
  }

  if (raw.size > MAX_SIZE) {
    return fail("File exceeds 20MB limit", 400)
  }

  const uploaded = await uploadToUploadThing(raw)
  if (!uploaded) {
    return fail("Upload to UploadThing failed — check server logs and env vars", 502)
  }

  return ok({
    fileUrl: uploaded.url,
    storagePath: uploaded.key, // reused generic field name for compatibility with existing schema
    fileName: raw.name,
    fileType: raw.type || "application/octet-stream",
    fileSize: raw.size,
  })
}

export async function GET() {
  return fail("Method Not Allowed", 405)
}
