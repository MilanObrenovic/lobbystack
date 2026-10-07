import { NextResponse } from "next/server";

import { deleteEmployee, updateEmployee } from "@lobbystack/domain";
import { asApiResponse, jsonError, readJson, requireOperatorBusiness } from "@/lib/api-helpers";
import { createDomainContext } from "@/lib/domain-context";
import { normalizePhoneNumber } from "@/lib/phone";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ employeeId: string }> }) {
  try {
    const { session, businessId } = await requireOperatorBusiness(request);
    const body = await readJson(request);
    const fields = typeof body === "object" && body !== null ? body as { name?: unknown; phone?: unknown } : {};
    const name = typeof fields.name === "string" ? fields.name.trim().slice(0, 200) : "";
    if (!name) return jsonError("Employee name is required.", 400, "employee_name_required");
    const phone = typeof fields.phone === "string" ? normalizePhoneNumber(fields.phone) : undefined;
    if (!phone) return jsonError("Enter a valid phone number.", 400, "employee_phone_invalid");
    const { employeeId } = await context.params;
    const employee = await updateEmployee(createDomainContext(), { userId: session.user.id, businessId, employeeId, name, phone });
    return employee ? NextResponse.json({ employee }) : jsonError("Employee not found.", 404);
  } catch (error) { return asApiResponse(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ employeeId: string }> }) {
  try {
    const { session, businessId } = await requireOperatorBusiness(request);
    const { employeeId } = await context.params;
    const deleted = await deleteEmployee(createDomainContext(), { userId: session.user.id, businessId, employeeId });
    return deleted ? NextResponse.json({ ok: true }) : jsonError("Employee not found.", 404);
  } catch (error) { return asApiResponse(error); }
}
