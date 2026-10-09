import { createHash, randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { businessHours, businessInvitations, businessMemberships, createDatabaseClient, services, staff, users, withBusinessTransaction, type Database, type DatabaseTransaction } from "@lobbystack/db";
import { findAvailability } from "./booking";
import { acceptInvitation, createBusiness, inviteMember, removeMember } from "./tenancy";

// Explicit opt-in only; never fall back to DATABASE_URL or load an env file.
const testUrl = process.env.LOBBYSTACK_RELIABILITY_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname) || !/test/i.test(url.pathname)) {
    throw new Error("Reliability integration tests require a dedicated local test database.");
  }
}
const client = testUrl ? createDatabaseClient("lobbystack_migrator", { DATABASE_URL: testUrl }) : undefined;
afterAll(async () => { await client?.pool.end(); });

async function rollbackTest(run: (tx: DatabaseTransaction) => Promise<void>) {
  const rollback = new Error("rollback test fixture");
  try {
    await client!.db.transaction(async (tx) => {
      await run(tx);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

describe.skipIf(!client)("createBusiness", () => {
  it("gives a new business a default staff member so it can take bookings", async () => {
    await rollbackTest(async (tx) => {
      const userId = randomUUID();
      const email = `${userId}@example.invalid`;
      await tx.insert(users).values({ id: userId, email, normalizedEmail: email, name: "Sam Owner" });
      await tx.execute(sql`set local role lobbystack_app`);
      const { businessId } = await createBusiness({ db: tx as unknown as Database }, { userId, name: "Northside Plumbing", timezone: "America/Toronto", businessType: "service_company" });
      await tx.execute(sql`reset role`);

      const members = await tx.select({ name: staff.name, active: staff.active }).from(staff).where(eq(staff.businessId, businessId));
      expect(members).toEqual([{ name: "Northside Plumbing", active: true }]);

      await tx.insert(businessHours).values({ businessId, dayOfWeek: 2, openMinutes: 8 * 60, closeMinutes: 17 * 60 });
      const [service] = await tx.insert(services).values({ businessId, name: "Drain cleaning", slug: "drain-cleaning", durationMinutes: 60 }).returning({ id: services.id });
      // Tuesday 2030-01-08 at 09:00 in Toronto.
      const slots = await findAvailability({ db: tx as unknown as Database }, { businessId, serviceId: service!.id, startsAt: "2030-01-08T14:00:00.000Z", timezone: "America/Toronto" });
      expect(slots.length).toBeGreaterThan(0);
    });
  });
});

describe.skipIf(!client)("acceptInvitation", () => {
  /** A business owned by Sam, with Ana's account, and a pending viewer invitation for Ana. */
  async function seed(tx: DatabaseTransaction) {
    const account = async (name: string) => {
      const id = randomUUID();
      const email = `${id}@example.invalid`;
      await tx.insert(users).values({ id, email, normalizedEmail: email, name });
      return { id, email };
    };
    const owner = await account("Sam Owner");
    const invitee = await account("Ana");
    const db = tx as unknown as Database;
    await tx.execute(sql`set local role lobbystack_app`);
    const { businessId } = await createBusiness({ db }, { userId: owner.id, name: "Northside Plumbing", timezone: "America/Toronto", businessType: "service_company" });
    const invite = async (email: string, role: "viewer" | "business_admin" = "viewer") => {
      const { token } = await inviteMember({ db }, { userId: owner.id, businessId, email, role });
      return createHash("sha256").update(token).digest("hex");
    };
    const roleOf = async (userId: string) => {
      await tx.execute(sql`reset role`);
      const [row] = await tx.select({ role: businessMemberships.role, status: businessMemberships.status }).from(businessMemberships).where(and(eq(businessMemberships.businessId, businessId), eq(businessMemberships.userId, userId)));
      await tx.execute(sql`set local role lobbystack_app`);
      return row;
    };
    const statusOf = async (tokenHash: string) => {
      await tx.execute(sql`reset role`);
      const [row] = await tx.select({ status: businessInvitations.status }).from(businessInvitations).where(eq(businessInvitations.tokenHash, tokenHash));
      await tx.execute(sql`set local role lobbystack_app`);
      return row?.status;
    };
    return { db, owner, invitee, businessId, invite, roleOf, statusOf };
  }

  it("refuses anyone but the invited email, so an owner opening the link keeps their role", async () => {
    await rollbackTest(async (tx) => {
      const { db, owner, invitee, invite, roleOf, statusOf } = await seed(tx);
      const tokenHash = await invite(invitee.email);
      await expect(acceptInvitation({ db }, { userId: owner.id, email: owner.email, tokenHash })).rejects.toMatchObject({ status: 403, code: "invitation_email_mismatch" });
      expect(await roleOf(owner.id)).toEqual({ role: "business_owner", status: "active" });
      expect(await statusOf(tokenHash)).toBe("pending");
    });
  });

  it("adds the invited person with the invited role", async () => {
    await rollbackTest(async (tx) => {
      const { db, businessId, invitee, invite, roleOf, statusOf } = await seed(tx);
      const tokenHash = await invite(invitee.email.toUpperCase());
      await expect(acceptInvitation({ db }, { userId: invitee.id, email: invitee.email, tokenHash })).resolves.toEqual({ businessId, role: "viewer" });
      expect(await roleOf(invitee.id)).toEqual({ role: "viewer", status: "active" });
      expect(await statusOf(tokenHash)).toBe("accepted");
    });
  });

  it("never lowers the role of someone who is already an active member", async () => {
    await rollbackTest(async (tx) => {
      const { db, businessId, owner, invite, roleOf } = await seed(tx);
      const tokenHash = await invite(owner.email);
      await expect(acceptInvitation({ db }, { userId: owner.id, email: owner.email, tokenHash })).resolves.toEqual({ businessId, role: "business_owner" });
      expect(await roleOf(owner.id)).toEqual({ role: "business_owner", status: "active" });
    });
  });

  it("lists every member, with their email, to each member of the business and to no one else", async () => {
    await rollbackTest(async (tx) => {
      const { db, businessId, owner, invitee, invite } = await seed(tx);
      await acceptInvitation({ db }, { userId: invitee.id, email: invitee.email, tokenHash: await invite(invitee.email) });
      const membersAs = async (userId: string) => await withBusinessTransaction(db, { userId, businessId, actorType: "operator" }, async (inner) =>
        (await inner.execute<{ email: string; role: string }>(sql`select email, role from app.list_business_members(${businessId}::uuid)`)).rows);
      const everyone = [{ email: owner.email, role: "business_owner" }, { email: invitee.email, role: "viewer" }];
      // Both memberships share the transaction's timestamp, so their order isn't fixed here.
      const byEmail = (rows: Array<{ email: string; role: string }>) => [...rows].sort((left, right) => left.email.localeCompare(right.email));
      expect(byEmail(await membersAs(owner.id))).toEqual(byEmail(everyone));
      expect(byEmail(await membersAs(invitee.id))).toEqual(byEmail(everyone));
      await tx.execute(sql`reset role`);
      const outsider = randomUUID();
      await tx.insert(users).values({ id: outsider, email: `${outsider}@example.invalid`, normalizedEmail: `${outsider}@example.invalid` });
      await tx.execute(sql`set local role lobbystack_app`);
      expect(await membersAs(outsider)).toEqual([]);
    });
  });

  it("drops a removed member from the team list, and refuses to remove them twice or remove the last owner", async () => {
    await rollbackTest(async (tx) => {
      const { db, businessId, owner, invitee, invite } = await seed(tx);
      await acceptInvitation({ db }, { userId: invitee.id, email: invitee.email, tokenHash: await invite(invitee.email) });
      const members = async () => await withBusinessTransaction(db, { userId: owner.id, businessId, actorType: "operator" }, async (inner) =>
        (await inner.execute<{ membership_id: string; email: string }>(sql`select membership_id, email from app.list_business_members(${businessId}::uuid)`)).rows);
      const listed = await members();
      const viewerMembership = listed.find((row) => row.email === invitee.email)!.membership_id;
      const ownerMembership = listed.find((row) => row.email === owner.email)!.membership_id;

      await removeMember({ db }, { userId: owner.id, businessId, membershipId: viewerMembership });
      expect((await members()).map((row) => row.email)).toEqual([owner.email]);
      await expect(removeMember({ db }, { userId: owner.id, businessId, membershipId: viewerMembership })).rejects.toMatchObject({ status: 404 });
      await expect(removeMember({ db }, { userId: owner.id, businessId, membershipId: ownerMembership })).rejects.toMatchObject({ status: 409, code: "final_owner" });
    });
  });
});
