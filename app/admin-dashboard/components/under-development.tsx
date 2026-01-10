"use client"

import { Construction } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface UnderDevelopmentProps {
  pageName: string
}

export function UnderDevelopment({ pageName }: UnderDevelopmentProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#6b2fa5]/10 flex items-center justify-center">
            <Construction className="w-8 h-8 text-[#6b2fa5]" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{pageName}</h2>
          <p className="text-gray-600">This part of the dashboard is under development. Check back later.</p>
        </CardContent>
      </Card>
    </div>
  )
}
