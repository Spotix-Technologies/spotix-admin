/**
 * app/api/v1/storage/upload/route.ts
 *
 * GET  /api/v1/storage/upload
 *   → the calling admin's own upload history (see admin_storage table,
 *     app/lib/admin-storage-db.ts), newest first.
 *
 * POST /api/v1/storage/upload
 *   multipart/form-data: { file: File }
 *   → Uploads an IMAGE ONLY (under 3MB) to UploadThing (server-side, via
 *     UTApi), records it in admin_storage (url, uploader uid, upload
 *     date), and returns the hosted URL so any admin can copy it.
 *
 * This is the general-purpose "Storage" menu item available on every
 * role dashboard, including Admin — unlike
 * app/api/v1/documents/upload/route.ts (exec-assistant only, up to
 * 20MB, any file type, used by the Documents feature), this one is
 * intentionally open to any registered admin and restricted to images
 * so it can't be used to smuggle in arbitrary large files.
 *
 * Access: any registered admin role.
 */
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { listStorageUploadsFor, recordStorageUpload } from "@/lib/admin-storage-db"

const TAG = "[/api/v1/storage/upload]"

function ok(data: object) {
  return NextResponse.json({ success: true, ...data }, { status: 200 })
}
function fail(message: string, status = 500) {
  console.error(`${TAG} ${status}: ${message}`)
  return NextResponse.json({ success: false, error: message }, { status })
}

const MAX_SIZE = 3 * 1024 * 1024 // 3MB

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
  const auth = await verifyAdminAccess(req)
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

  if (!raw.type.startsWith("image/")) {
    return fail("Only image files can be uploaded here", 400)
  }

  if (raw.size > MAX_SIZE) {
    return fail("Image exceeds the 3MB limit", 400)
  }

  const uploaded = await uploadToUploadThing(raw)
  if (!uploaded) {
    return fail("Upload to UploadThing failed — check server logs and env vars", 502)
  }

  const record = await recordStorageUpload({
    url: uploaded.url,
    uid: auth.uid,
    uploaded_by_name: auth.username,
    file_name: raw.name,
    file_size: raw.size,
    storage_key: uploaded.key,
  })

  return ok({
    fileUrl: uploaded.url,
    storagePath: uploaded.key,
    fileName: raw.name,
    fileType: raw.type,
    fileSize: raw.size,
    uploadedByUid: auth.uid,
    uploadedByUsername: auth.username,
    createdAt: record.created_at,
  })
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAccess(req)
  if ("error" in auth) return auth.error

  const uploads = await listStorageUploadsFor(auth.uid)
  return ok({ uploads })
}
