import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const events = db.getSyncEvents();
    return NextResponse.json({
      success: true,
      total: events.length,
      data: events,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const event = db.triggerSync(body.snapshotName);
    return NextResponse.json({
      success: true,
      message: "Snapshot do banco de dados sincronizado com sucesso no cofre de nuvem.",
      data: event,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
