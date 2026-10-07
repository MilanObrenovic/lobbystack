import { NextResponse } from "next/server";

import { deleteEmployee } from "@lobbystack/domain";
import { asApiResponse, jsonError, requireOperatorBusiness } from "@/lib/api-helpers";
import { createDomainContext } from "@/lib/domain-context";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: { params: Promise<{ employeeId: string }> }) {
  try {
    const { session, businessId } = await requireOperatorBusiness(request);
    const { employeeId } = await context.params;
    const deleted = await deleteEmployee(createDomainContext(), { userId: session.user.id, businessId, employeeId });
    return deleted ? NextResponse.json({ ok: true }) : jsonError("Employee not found.", 404);
  } catch (error) { return asApiResponse(error); }
}
