# ContractOps Quick Capture (Chrome extension)

Log a vendor and contract into ContractOps from any page, without opening the full app.

## Install (unpacked, for now)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this `chrome-extension/` folder.
4. Pin the ContractOps icon from the extensions toolbar menu.

## Use

1. Click the icon, sign in with your ContractOps account (same login as the web app).
2. Pick an existing vendor (search by name) or switch to "New vendor" to create one inline.
3. Fill in the contract fields — the title and a note with the page URL are pre-filled from
   the current tab, but everything is editable.
4. **Save to ContractOps.** The vendor (if new) and contract are written straight to the same
   Supabase database the web app uses, respecting your organization's data — nothing is
   duplicated or held in a separate store.
5. Click **Open in ContractOps** to jump straight to the new contract's detail page.

## How it talks to the app

The extension calls Supabase's Auth and REST APIs directly with the same public anon key the
web app ships to browsers (safe to embed — see `config.js`). Row-level security on the
`vendors`/`contracts`/`contract_events` tables scopes every read and write to the signed-in
user's organization, so the extension can't see or touch another org's data. No new backend
endpoints were added to the Next.js app for this.

## Settings

Click **Settings** in the popup footer to set the app's URL (used only for the "Open in
ContractOps" link after saving). Defaults to a guess at the Vercel deployment URL — update it
if that's wrong for your project.
