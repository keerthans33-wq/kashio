import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { uploadReceipt } from "@/lib/receipts/uploadReceipt";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const userId = await getUser();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const result = await uploadReceipt(file, userId);

    if (!result.ok) {
      const status = result.error === "PAYWALL_REQUIRED" ? 402 : 400;
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status },
      );
    }

    return NextResponse.json({ receipt: result.receipt });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    console.error("[receipts/upload] unhandled error:", msg);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: msg },
      { status: 500 },
    );
  }
}
