import { notFound } from "next/navigation";
import { ApplicationForm } from "@/components/ApplicationForm";
import { submitApplication } from "@/app/(app)/applications/actions";
import { createClient } from "@/lib/supabase/server";
import { panel } from "@/components/theme";

export const dynamic = "force-dynamic";

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!organization) {
    notFound();
  }

  const submitApplicationForOrg = submitApplication.bind(null, organization.slug);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-12">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
          {organization.name}
        </p>
        <h1 className="text-sm font-bold uppercase tracking-wider text-slate-400">Vendor application</h1>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">
          Tell us about your company and the contract you&apos;re looking for.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          {organization.name}&apos;s contract administrators will review your application. If
          approved, you&apos;ll be registered as a vendor and a draft contract will be opened for
          you.
        </p>
      </div>
      <div className={`p-6 ${panel}`}>
        <ApplicationForm action={submitApplicationForOrg} />
      </div>
    </div>
  );
}
