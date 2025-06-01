import { NextResponse } from "next/server"
import { getBotInfo } from "@/app/actions"

export async function GET() {
  try {
    const result = await getBotInfo()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Failed to get bot info:", error)
    return NextResponse.json({ success: false, error: "Failed to get bot info" }, { status: 500 })
  }
}
