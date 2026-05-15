import { eq, and } from "drizzle-orm";
import { invitations } from "../schema";
import type { Database } from "..";

export async function getInvitations(db: Database, orgId: string) {
  return db.query.invitations.findMany({
    where: eq(invitations.organizationId, orgId),
    orderBy: (i, { desc }) => [desc(i.createdAt)],
  });
}

export async function createInvitation(
  db: Database,
  data: {
    organizationId: string;
    email: string;
    role?: string;
    invitedBy?: string;
    expiresAt: string;
  },
) {
  const [invitation] = await db.insert(invitations).values(data).returning();
  return invitation;
}

export async function getInvitationByToken(db: Database, token: string) {
  return db.query.invitations.findFirst({
    where: eq(invitations.token, token),
    with: { organization: true },
  });
}

export async function deleteInvitation(db: Database, id: string) {
  await db.delete(invitations).where(eq(invitations.id, id));
}

export async function acceptInvitation(db: Database, id: string) {
  const [invitation] = await db
    .update(invitations)
    .set({ acceptedAt: new Date().toISOString() })
    .where(eq(invitations.id, id))
    .returning();
  return invitation;
}
