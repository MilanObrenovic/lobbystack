import { and, asc, count, desc, eq, ilike, ne, or } from "drizzle-orm";

import { businesses, employees, enqueueOutbox, staff, withBusinessTransaction, type DatabaseTransaction } from "@lobbystack/db";

import { requireBusinessAdmin, requireBusinessMembership } from "../authz";
import type { DomainContext } from "./context";

const employeeColumns = { id: employees.id, name: employees.name, phone: employees.phone, createdAt: employees.createdAt, updatedAt: employees.updatedAt };

async function refreshSnapshot(tx: DatabaseTransaction, businessId: string, employeeId: string, reason: string) {
  await enqueueOutbox(tx, { topic: "snapshot.refresh", businessId, aggregateType: "employee", aggregateId: employeeId, dedupeKey: `employee:${employeeId}:snapshot:${Date.now()}`, payload: { businessId, reason } });
}

async function assertPhoneAvailable(tx: DatabaseTransaction, input: { businessId: string; phone: string; employeeId?: string }) {
  const duplicate = await tx.select({ id: employees.id }).from(employees).where(and(eq(employees.businessId, input.businessId), eq(employees.phone, input.phone), ...(input.employeeId ? [ne(employees.id, input.employeeId)] : []))).limit(1);
  if (duplicate.length) throw Object.assign(new Error("An employee with this phone number already exists."), { status: 409, code: "employee_phone_exists" });
}

function requireName(value: string): string {
  const name = value.trim();
  if (!name) throw Object.assign(new Error("Employee name is required."), { status: 400, code: "employee_name_required" });
  return name;
}

export async function listEmployees(
  context: DomainContext,
  input: { userId: string; businessId: string; search?: string; limit?: number; offset?: number },
) {
  return await withBusinessTransaction(context.db, { ...input, actorType: "operator" }, async (tx) => {
    await requireBusinessMembership(tx, input);
    const limit = Math.min(Math.max(Math.trunc(input.limit ?? 50), 1), 100);
    const offset = Math.max(Math.trunc(input.offset ?? 0), 0);
    const search = input.search?.trim();
    const filter = and(eq(employees.businessId, input.businessId), ...(search ? [or(ilike(employees.name, `%${search}%`), ilike(employees.phone, `%${search.replace(/[\s()-]/g, "")}%`))!] : []));
    const [rows, total] = await Promise.all([
      tx.select(employeeColumns)
        .from(employees).where(filter).orderBy(desc(employees.createdAt), asc(employees.id)).limit(limit + 1).offset(offset),
      tx.select({ count: count() }).from(employees).where(filter),
    ]);
    return { employees: rows.slice(0, limit), pagination: { limit, offset, total: Number(total[0]?.count ?? 0), hasNext: rows.length > limit } };
  });
}

/** Adds an employee and the staff member that bookings are assigned to. `phone` must be E.164. */
export async function createEmployee(
  context: DomainContext,
  input: { userId: string; businessId: string; name: string; phone: string },
) {
  return await withBusinessTransaction(context.db, { ...input, actorType: "operator" }, async (tx) => {
    await requireBusinessAdmin(tx, input);
    const name = requireName(input.name);
    await assertPhoneAvailable(tx, input);
    const [business] = await tx.select({ timezone: businesses.timezone }).from(businesses).where(eq(businesses.id, input.businessId)).limit(1);
    if (!business) throw Object.assign(new Error("Business not found."), { status: 404 });
    const [member] = await tx.insert(staff).values({ businessId: input.businessId, name, timezone: business.timezone }).returning({ id: staff.id });
    if (!member) throw new Error("Staff member could not be created.");
    const [employee] = await tx.insert(employees).values({ businessId: input.businessId, name, phone: input.phone, staffId: member.id }).returning(employeeColumns);
    if (!employee) throw new Error("Employee could not be created.");
    await refreshSnapshot(tx, input.businessId, employee.id, "employee_created");
    return employee;
  });
}

export async function updateEmployee(
  context: DomainContext,
  input: { userId: string; businessId: string; employeeId: string; name: string; phone: string },
) {
  return await withBusinessTransaction(context.db, { ...input, actorType: "operator" }, async (tx) => {
    await requireBusinessAdmin(tx, input);
    const name = requireName(input.name);
    await assertPhoneAvailable(tx, input);
    const now = new Date();
    const [employee] = await tx.update(employees).set({ name, phone: input.phone, updatedAt: now })
      .where(and(eq(employees.id, input.employeeId), eq(employees.businessId, input.businessId)))
      .returning({ ...employeeColumns, staffId: employees.staffId });
    if (!employee) return null;
    const { staffId, ...result } = employee;
    if (staffId) await tx.update(staff).set({ name, updatedAt: now }).where(and(eq(staff.id, staffId), eq(staff.businessId, input.businessId)));
    await refreshSnapshot(tx, input.businessId, employee.id, "employee_updated");
    return result;
  });
}

/** Removes the employee. Its staff member is deactivated, not deleted, so past appointments keep their assignee. */
export async function deleteEmployee(
  context: DomainContext,
  input: { userId: string; businessId: string; employeeId: string },
): Promise<boolean> {
  return await withBusinessTransaction(context.db, { ...input, actorType: "operator" }, async (tx) => {
    await requireBusinessAdmin(tx, input);
    const [deleted] = await tx.delete(employees).where(and(eq(employees.id, input.employeeId), eq(employees.businessId, input.businessId))).returning({ id: employees.id, staffId: employees.staffId });
    if (!deleted) return false;
    if (deleted.staffId) await tx.update(staff).set({ active: false, updatedAt: new Date() }).where(and(eq(staff.id, deleted.staffId), eq(staff.businessId, input.businessId)));
    await refreshSnapshot(tx, input.businessId, deleted.id, "employee_deleted");
    return true;
  });
}

/** The business's bookable employees, with the staff member each one books under. */
export async function listBookableEmployees(tx: DatabaseTransaction, businessId: string) {
  return await tx.select({ name: employees.name, staffId: staff.id }).from(employees)
    .innerJoin(staff, and(eq(staff.id, employees.staffId), eq(staff.businessId, businessId), eq(staff.active, true)))
    .where(eq(employees.businessId, businessId))
    .orderBy(asc(employees.createdAt), asc(employees.id));
}

/** Matches a name the caller gave to one employee: an exact match, else a single partial match. */
export async function resolveEmployee(context: DomainContext, input: { businessId: string; name: string }) {
  const wanted = input.name.trim().toLowerCase();
  const rows = await withBusinessTransaction(context.db, { businessId: input.businessId, actorType: "worker" }, async (tx) => await listBookableEmployees(tx, input.businessId));
  const exact = rows.filter((row) => row.name.trim().toLowerCase() === wanted);
  const matches = exact.length || !wanted ? exact : rows.filter((row) => row.name.toLowerCase().includes(wanted));
  return matches.length === 1
    ? { ok: true as const, staffId: matches[0]!.staffId, name: matches[0]!.name }
    : { ok: false as const, employees: rows.map((row) => row.name) };
}
