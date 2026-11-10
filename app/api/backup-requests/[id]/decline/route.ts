import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const backupReq = await prisma.backupRequest.findUnique({
      where: { id },
    });

    if (!backupReq) {
      return NextResponse.json({ error: "Backup request not found" }, { status: 404 });
    }

    if (backupReq.status !== "PENDING") {
      return NextResponse.json(
        { error: `Backup request is already ${backupReq.status}` },
        { status: 400 }
      );
    }

    const updated = await prisma.backupRequest.update({
      where: { id },
      data: {
        status: "DECLINED",
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Backup request marked as DECLINED",
      backupRequest: updated,
    });
  } catch (error) {
    console.error("Backup request decline failed:", error);
    return NextResponse.json(
      { error: "Failed to decline backup request" },
      { status: 500 }
    );
  }
}
