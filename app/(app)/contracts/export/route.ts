import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { sweepExpiredContracts } from "@/lib/contracts";
import type { ContractWithVendor } from "@/lib/types";

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  await requireProfile();
  const supabase = await createClient();
  await sweepExpiredContracts(supabase);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const view = searchParams.get("view");
  const q = searchParams.get("q");

  let query = supabase
    .from("contracts")
    .select("*, vendors(id, vendor_code, name)")
    .order("end_date", { ascending: true, nullsFirst: false });

  if (status) query = query.eq("status", status);
  if (view === "closed") query = query.in("status", ["terminated", "expired"]);
  if (q) query = query.or(`title.ilike.%${q}%,contract_code.ilike.%${q}%,contract_type.ilike.%${q}%`);

  const { data: contracts, error } = await query;
  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const rows = (contracts as ContractWithVendor[] | null) ?? [];
  const header = [
    "Contract #",
    "Title",
    "Vendor ID",
    "Vendor name",
    "Status",
    "Contract type",
    "Start date",
    "End date",
    "Value",
    "Currency",
    "Owner",
    "Auto-renew",
    "Terminated at",
    "Termination reason",
  ];

  const lines = [header.map(csvCell).join(",")];
  for (const c of rows) {
    lines.push(
      [
        c.contract_code,
        c.title,
        c.vendors?.vendor_code ?? "",
        c.vendors?.name ?? "",
        c.status,
        c.contract_type ?? "",
        c.start_date ?? "",
        c.end_date ?? "",
        c.value ?? "",
        c.currency,
        c.owner_name ?? "",
        c.auto_renew ? "yes" : "no",
        c.terminated_at ?? "",
        c.termination_reason ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const csv = lines.join("\r\n");
  const filename = `contracts-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
