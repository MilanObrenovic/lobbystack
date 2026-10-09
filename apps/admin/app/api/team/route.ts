import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { businessInvitations } from "@lobbystack/db";
import { inviteMember, removeMember, revokeInvitation, updateMemberRole } from "@lobbystack/domain";
import { asApiResponse, businessIdFromRequest, jsonError, readJson, requireApiSession, withOperatorTransaction } from "@/lib/api-helpers";
import { createDomainContext } from "@/lib/domain-context";

export const dynamic = "force-dynamic";

const roles = ["business_admin", "scheduler", "viewer"] as const;
type InviteRole = (typeof roles)[number];

export async function GET(request: Request) {
  try {
    return NextResponse.json(await withOperatorTransaction(request, async ({ businessId, tx }) => {
      const [rows, invitations] = await Promise.all([
        // users_self_access hides other members' users rows from this role, so read them through the function.
        tx.execute<{ membership_id: string; user_id: string; name: string | null; email: string; role: string; status: string; joined_at: Date }>(sql`select membership_id, user_id, name, email, role, status, joined_at from app.list_business_members(${businessId}::uuid)`)
          .then((result) => result.rows.map((row) => ({ membershipId: row.membership_id, userId: row.user_id, name: row.name, email: row.email, role: row.role, status: row.status, joinedAt: row.joined_at }))),
        tx.select({ invitationId: businessInvitations.id, email: businessInvitations.email, role: businessInvitations.role, status: businessInvitations.status, expiresAt: businessInvitations.expiresAt, invitedAt: businessInvitations.createdAt }).from(businessInvitations).where(eq(businessInvitations.businessId, businessId)),
      ]);
      return { members: rows, invitations };
    }));
  } catch (error) {
    return asApiResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireApiSession(request);
    const businessId = businessIdFromRequest(request);
    const body = await readJson(request) as { membershipId?: string; role?: string };
    if (!businessId || !body.membershipId || !body.role || !["business_admin", "scheduler", "viewer"].includes(body.role)) return jsonError("businessId, membershipId, and a permitted role are required.", 400);
    await updateMemberRole(createDomainContext(), { userId: session.user.id, businessId, membershipId: body.membershipId, role: body.role as "business_admin" | "scheduler" | "viewer" });
    return NextResponse.json({ ok: true });
  } catch (error) { return asApiResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireApiSession(request);
    const businessId = businessIdFromRequest(request);
    const body = await readJson(request) as { membershipId?: string; invitationId?: string };
    if (!businessId || (!body.membershipId && !body.invitationId)) return jsonError("businessId and a membershipId or invitationId are required.", 400);
    if (body.membershipId) await removeMember(createDomainContext(), { userId: session.user.id, businessId, membershipId: body.membershipId });
    else await revokeInvitation(createDomainContext(), { userId: session.user.id, businessId, invitationId: body.invitationId! });
    return NextResponse.json({ ok: true });
  } catch (error) { return asApiResponse(error); }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(request);
    const body = await readJson(request);
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new Error("An invitation object is required.");
    const input = body as Record<string, unknown>;
    const businessId = typeof input.businessId === "string" ? input.businessId : businessIdFromRequest(request);
    if (!businessId) throw new Error("A businessId is required.");
    if (typeof input.email !== "string" || !input.email.trim()) throw new Error("email is required.");
    if (typeof input.role !== "string" || !roles.includes(input.role as InviteRole)) throw new Error("role is invalid.");
    return NextResponse.json(await inviteMember(createDomainContext(), { userId: session.user.id, businessId, email: input.email, role: input.role as InviteRole }), { status: 201 });
  } catch (error) {
    return asApiResponse(error);
  }
}
