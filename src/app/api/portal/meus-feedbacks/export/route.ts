import { NextResponse } from "next/server";

import { getAuthenticatedActor } from "@/lib/auth/session";
import { getFeedbackExportCsv } from "@/lib/feedback/feedback-service";

export async function GET() {
  const actor = await getAuthenticatedActor();
  if (!actor) return new NextResponse("Não autenticado.", { status: 401 });

  const result = await getFeedbackExportCsv(actor);
  if (!result.ok) return new NextResponse(result.message, { status: result.status });

  return new NextResponse(result.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="feedbacks-ggp.csv"',
      "Cache-Control": "no-store",
    },
  });
}
