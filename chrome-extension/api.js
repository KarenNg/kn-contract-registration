// Thin wrapper around Supabase's Auth + PostgREST HTTP APIs. No bundled SDK —
// just fetch() — so the extension has zero build step and stays within the
// Manifest V3 "no remotely-hosted code" rule.

const Api = (() => {
  const AUTH_URL = `${SUPABASE_URL}/auth/v1`;
  const REST_URL = `${SUPABASE_URL}/rest/v1`;

  async function getStoredSession() {
    const { session } = await chrome.storage.local.get("session");
    return session || null;
  }

  async function storeSession(session) {
    await chrome.storage.local.set({ session });
  }

  async function clearSession() {
    await chrome.storage.local.remove("session");
  }

  function withExpiry(tokenResponse) {
    return {
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      expires_at: Date.now() + (tokenResponse.expires_in - 30) * 1000,
      user: { id: tokenResponse.user.id, email: tokenResponse.user.email },
    };
  }

  async function signIn(email, password) {
    const res = await fetch(`${AUTH_URL}/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error_description || data.msg || "Sign-in failed");
    }
    const session = withExpiry(data);
    await storeSession(session);
    return session;
  }

  async function signOut() {
    const session = await getStoredSession();
    if (session) {
      await fetch(`${AUTH_URL}/logout`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` },
      }).catch(() => {});
    }
    await clearSession();
  }

  async function refresh(session) {
    const res = await fetch(`${AUTH_URL}/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    const data = await res.json();
    if (!res.ok) {
      await clearSession();
      return null;
    }
    const fresh = withExpiry(data);
    await storeSession(fresh);
    return fresh;
  }

  async function ensureSession() {
    let session = await getStoredSession();
    if (!session) return null;
    if (Date.now() >= session.expires_at) {
      session = await refresh(session);
    }
    return session;
  }

  async function rest(path, { method = "GET", body, headers = {} } = {}) {
    const session = await ensureSession();
    if (!session) {
      throw new Error("Not signed in");
    }
    const res = await fetch(`${REST_URL}/${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const message = (data && (data.message || data.error_description)) || res.statusText;
      throw new Error(message);
    }
    return data;
  }

  async function myProfile() {
    const session = await ensureSession();
    if (!session) return null;
    const rows = await rest(
      `profiles?id=eq.${session.user.id}&select=full_name,organizations(name)`,
    );
    const profile = rows && rows[0];
    return {
      email: session.user.email,
      fullName: profile?.full_name || null,
      organizationName: profile?.organizations?.name || null,
    };
  }

  async function searchVendors(query) {
    const q = encodeURIComponent(`*${query}*`);
    return rest(`vendors?name=ilike.${q}&select=id,vendor_code,name&order=name&limit=8`);
  }

  async function createVendor(values) {
    const rows = await rest("vendors", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: values,
    });
    return rows[0];
  }

  async function createContract(values) {
    const rows = await rest("contracts", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: values,
    });
    return rows[0];
  }

  async function logContractEvent(contractId, summary, detail) {
    await rest("contract_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: {
        contract_id: contractId,
        event_type: "created",
        summary,
        detail,
        actor_name: "Chrome extension",
      },
    });
  }

  return {
    getStoredSession,
    signIn,
    signOut,
    ensureSession,
    myProfile,
    searchVendors,
    createVendor,
    createContract,
    logContractEvent,
  };
})();
