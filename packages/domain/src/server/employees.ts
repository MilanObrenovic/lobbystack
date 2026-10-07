import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";

import { employees, withBusinessTransaction } from "@lobbystack/db";

import { requireBusinessAdmin, requireBusinessMembership } from "../authz";
import type { DomainContext } from "./context";

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
      tx.select({ id: employees.id, name: employees.name, phone: employees.phone, createdAt: employees.createdAt, updatedAt: employees.updatedAt })
        .from(employees).where(filter).orderBy(desc(employees.createdAt), asc(employees.id)).limit(limit + 1).offset(offset),
      tx.select({ count: count() }).from(employees).where(filter),
    ]);
    return { employees: rows.slice(0, limit), pagination: { limit, offset, total: Number(total[0]?.count ?? 0), hasNext: rows.length > limit } };
  });
}

/** Adds an employee. `phone` must already be in E.164 form. */
export async function createEmployee(
  context: DomainContext,
  input: { userId: string; businessId: string; name: string; phone: string },
) {
  return await withBusinessTransaction(context.db, { ...input, actorType: "operator" }, async (tx) => {
    await requireBusinessAdmin(tx, input);
    const name = input.name.trim();
    if (!name) throw Object.assign(new Error("Employee name is required."), { status: 400, code: "employee_name_required" });
    const [employee] = await tx.insert(employees).values({ businessId: input.businessId, name, phone: input.phone })
      .onConflictDoNothing({ target: [employees.businessId, employees.phone] })
      .returning({ id: employees.id, name: employees.name, phone: employees.phone, createdAt: employees.createdAt, updatedAt: employees.updatedAt });
    if (!employee) throw Object.assign(new Error("An employee with this phone number already exists."), { status: 409, code: "employee_phone_exists" });
    return employee;
  });
}

export async function deleteEmployee(
  context: DomainContext,
  input: { userId: string; businessId: string; employeeId: string },
): Promise<boolean> {
  return await withBusinessTransaction(context.db, { ...input, actorType: "operator" }, async (tx) => {
    await requireBusinessAdmin(tx, input);
    const deleted = await tx.delete(employees).where(and(eq(employees.id, input.employeeId), eq(employees.businessId, input.businessId))).returning({ id: employees.id });
    return deleted.length > 0;
  });
}
