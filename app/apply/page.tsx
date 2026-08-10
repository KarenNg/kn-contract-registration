import { ApplicationForm } from "@/components/ApplicationForm";
import { submitApplication } from "@/app/applications/actions";
import { panel } from "@/components/theme";

export default function ApplyPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-sm font-bold uppercase tracking-wider text-slate-400">Vendor application</h1>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">
          Tell us about your company and the contract you&apos;re looking for.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Our contract administrators will review your application. If approved, you&apos;ll be
          registered as a vendor and a draft contract will be opened for you.
        </p>
      </div>
      <div className={`p-6 ${panel}`}>
        <ApplicationForm action={submitApplication} />
      </div>
    </div>
  );
}
