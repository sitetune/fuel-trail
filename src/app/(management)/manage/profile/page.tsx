import { ProfileForm } from "@/components/account/profile-form";
import { requireManagement } from "@/lib/auth/session";

export default async function ManageProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; pending?: string; saved?: string }>;
}) {
  const user = await requireManagement();
  const params = await searchParams;
  const error =
    params.error === "name"
      ? "Enter a name."
      : params.error === "email"
        ? "Could not start the email change. Try again."
        : params.error === "save"
          ? "Could not save your profile."
          : params.saved
            ? undefined
            : undefined;
  return (
    <div className="space-y-3">
      {params.saved ? <p className="text-sm text-success">Saved.</p> : null}
      <ProfileForm
        fullName={user.profile.full_name}
        phone={user.profile.phone}
        email={user.profile.email}
        emailPending={params.pending}
        error={error}
      />
    </div>
  );
}
