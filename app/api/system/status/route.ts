import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const stats = db.getStats();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cluster: {
        nodeEnv: process.env.NODE_ENV || "production",
        uptimeSeconds: Math.floor(process.uptime()),
        platform: process.platform,
        arch: process.arch,
      },
      stats,
      vault: {
        repo: "vns24k/vault-backup",
        status: "Sincronizado",
        encryption: "SHA-256 + End-to-End Private",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
