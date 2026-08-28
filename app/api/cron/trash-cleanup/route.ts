import { NextRequest, NextResponse } from "next/server";
import { autoDeleteOldTrashedFiles } from "@/lib/actions/file.actions";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
    if (!CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authHeader = request.headers.get("authorization");

    if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await autoDeleteOldTrashedFiles();
        const status = result.success ? 200 : 500;
        return NextResponse.json(result, { status });
    } catch (error) {
        console.error("Trash cleanup cron failed:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
