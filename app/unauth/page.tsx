import type { Metadata } from "next"
import Link from "next/link"
import { ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Unauthorized | Spotix Admin Portal",
  description: "You do not have permission to access this area",
}

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldX className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">Unauthorized</h1>

        <p className="text-gray-600 text-lg mb-8">Are you lost or something? You probably shouldn&apos;t be here.</p>

        <Link href="/login">
          <Button className="bg-[#6b2fa5] hover:bg-[#5a2889] text-white font-semibold px-8 py-3">
            Go!
          </Button>
        </Link>
      </div>
    </div>
  )
}
