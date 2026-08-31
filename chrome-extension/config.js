// ContractOps project connection. The anon key is a public, RLS-restricted
// key (same one the web app ships to browsers) — it grants nothing on its
// own until a user signs in, at which point Postgres row-level security
// scopes every read/write to that user's organization_id.
const SUPABASE_URL = "https://osdlsjydmrndbardyihz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZGxzanlkbXJuZGJhcmR5aWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwODExNDgsImV4cCI6MjEwMDY1NzE0OH0.Wc5RH0uNZzehcPK3NLjSceg6ar13gnUXIEkYeTCnGOA";

// Default base URL for "open in ContractOps" links. Editable on the options
// page — this is only a guess at the Vercel deployment's URL.
const DEFAULT_APP_URL = "https://kn-contract-registration.vercel.app";
