import { Nav } from "@/components/Nav";
import { requireProfile } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <>
      <Nav
        organizationName={profile.organizationName}
        organizationSlug={profile.organizationSlug}
        email={profile.email}
        isPlatformAdmin={profile.isPlatformAdmin}
      />
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </>
  );
}
