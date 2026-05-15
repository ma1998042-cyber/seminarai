import { getPendingInvitations } from "./actions";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const invitations = await getPendingInvitations();

  const pendingInvitations = invitations.map((inv) => ({
    token: inv.token,
    role: inv.role,
    organizationName: inv.organization.name,
  }));

  return <OnboardingClient pendingInvitations={pendingInvitations} />;
}
