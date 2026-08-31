const views = {
  loading: document.getElementById("loading-view"),
  login: document.getElementById("login-view"),
  capture: document.getElementById("capture-view"),
  success: document.getElementById("success-view"),
};

function showView(name) {
  Object.entries(views).forEach(([key, el]) => el.classList.toggle("hidden", key !== name));
}

function showError(el, message) {
  el.textContent = message;
  el.classList.remove("hidden");
}

function clearError(el) {
  el.textContent = "";
  el.classList.add("hidden");
}

let selectedVendor = null; // { id, name, vendor_code } | null
let vendorMode = "existing"; // "existing" | "new"

async function init() {
  showView("loading");
  const session = await Api.getStoredSession();
  if (!session) {
    showView("login");
    return;
  }
  try {
    await enterCaptureView();
  } catch (err) {
    // Session invalid/expired beyond refresh — fall back to login.
    await Api.signOut();
    showView("login");
  }
}

async function enterCaptureView() {
  const profile = await Api.myProfile();
  document.getElementById("who-org").textContent = profile?.organizationName
    ? `${profile.organizationName} · ${profile.email}`
    : profile?.email || "Signed in";
  await prefillFromActiveTab();
  showView("capture");
}

async function prefillFromActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    const titleEl = document.getElementById("contract-title");
    const notesEl = document.getElementById("contract-notes");
    if (tab.title && !titleEl.value) titleEl.value = tab.title;
    if (tab.url && !notesEl.value) notesEl.value = `Captured from ${tab.url}`;
  } catch {
    // tabs permission unavailable in this context — not fatal
  }
}

// ---- Login ----

document.getElementById("login-submit").addEventListener("click", async () => {
  const errorEl = document.getElementById("login-error");
  clearError(errorEl);
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  if (!email || !password) {
    showError(errorEl, "Enter your email and password.");
    return;
  }
  const btn = document.getElementById("login-submit");
  btn.disabled = true;
  btn.textContent = "Signing in…";
  try {
    await Api.signIn(email, password);
    await enterCaptureView();
  } catch (err) {
    showError(errorEl, err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Sign in";
  }
});

document.getElementById("sign-out").addEventListener("click", async () => {
  await Api.signOut();
  showView("login");
});

// ---- Vendor tabs ----

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    vendorMode = btn.dataset.mode;
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
    document.getElementById("vendor-existing").classList.toggle("hidden", vendorMode !== "existing");
    document.getElementById("vendor-new").classList.toggle("hidden", vendorMode !== "new");
  });
});

// ---- Vendor search ----

let searchTimer = null;
document.getElementById("vendor-search").addEventListener("input", (e) => {
  const query = e.target.value.trim();
  selectedVendor = null;
  document.getElementById("vendor-selected").classList.add("hidden");
  clearTimeout(searchTimer);
  const resultsEl = document.getElementById("vendor-results");
  if (query.length < 2) {
    resultsEl.classList.add("hidden");
    resultsEl.innerHTML = "";
    return;
  }
  searchTimer = setTimeout(async () => {
    try {
      const vendors = await Api.searchVendors(query);
      renderVendorResults(vendors || []);
    } catch {
      resultsEl.classList.add("hidden");
    }
  }, 250);
});

function renderVendorResults(vendors) {
  const resultsEl = document.getElementById("vendor-results");
  if (vendors.length === 0) {
    resultsEl.innerHTML = '<div class="result-item">No matches — try "New vendor" above.</div>';
    resultsEl.classList.remove("hidden");
    return;
  }
  resultsEl.innerHTML = "";
  vendors.forEach((v) => {
    const item = document.createElement("div");
    item.className = "result-item";
    item.innerHTML = `${escapeHtml(v.name)} <span class="code">${escapeHtml(v.vendor_code)}</span>`;
    item.addEventListener("click", () => selectVendor(v));
    resultsEl.appendChild(item);
  });
  resultsEl.classList.remove("hidden");
}

function selectVendor(v) {
  selectedVendor = v;
  document.getElementById("vendor-results").classList.add("hidden");
  document.getElementById("vendor-search").value = "";
  const selectedEl = document.getElementById("vendor-selected");
  selectedEl.innerHTML = `<span>${escapeHtml(v.name)} (${escapeHtml(v.vendor_code)})</span><button type="button">Change</button>`;
  selectedEl.querySelector("button").addEventListener("click", () => {
    selectedVendor = null;
    selectedEl.classList.add("hidden");
  });
  selectedEl.classList.remove("hidden");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---- Submit ----

document.getElementById("submit-btn").addEventListener("click", async () => {
  const errorEl = document.getElementById("form-error");
  clearError(errorEl);

  const title = document.getElementById("contract-title").value.trim();
  const status = document.getElementById("contract-status").value;
  const endDate = document.getElementById("contract-end").value || null;

  if (!title) {
    showError(errorEl, "Contract title is required.");
    return;
  }
  if (["active", "renewed"].includes(status) && !endDate) {
    showError(errorEl, "An end date is required before a contract can go active.");
    return;
  }

  let vendorId = selectedVendor?.id || null;
  let newVendorName = "";
  if (vendorMode === "new") {
    newVendorName = document.getElementById("new-vendor-name").value.trim();
    if (!newVendorName) {
      showError(errorEl, "Vendor name is required.");
      return;
    }
  } else if (!vendorId) {
    showError(errorEl, "Select an existing vendor, or switch to \"New vendor\".");
    return;
  }

  const btn = document.getElementById("submit-btn");
  btn.disabled = true;
  btn.textContent = "Saving…";

  try {
    if (vendorMode === "new") {
      const vendor = await Api.createVendor({
        name: newVendorName,
        contact_name: valueOrNull("new-vendor-contact-name"),
        contact_email: valueOrNull("new-vendor-contact-email"),
        contact_phone: valueOrNull("new-vendor-contact-phone"),
        address: valueOrNull("new-vendor-address"),
        status: "active",
      });
      vendorId = vendor.id;
    }

    const rawValue = document.getElementById("contract-value").value;
    const contract = await Api.createContract({
      vendor_id: vendorId,
      title,
      contract_type: valueOrNull("contract-type"),
      description: valueOrNull("contract-description"),
      start_date: document.getElementById("contract-start").value || null,
      end_date: endDate,
      value: rawValue ? Number(rawValue) : null,
      currency: document.getElementById("contract-currency").value.trim() || "USD",
      status,
      owner_name: valueOrNull("contract-owner"),
      auto_renew: document.getElementById("contract-auto-renew").checked,
      notes: valueOrNull("contract-notes"),
    });

    await Api.logContractEvent(contract.id, "Contract created", `Status: ${status} (via Chrome extension)`);

    showSuccess(contract);
  } catch (err) {
    showError(errorEl, err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Save to ContractOps";
  }
});

function valueOrNull(id) {
  const v = document.getElementById(id).value.trim();
  return v || null;
}

let lastContractId = null;

function showSuccess(contract) {
  lastContractId = contract.id;
  document.getElementById("success-message").textContent =
    `Contract ${contract.contract_code} was saved.`;
  showView("success");
}

document.getElementById("open-app").addEventListener("click", async () => {
  const { appUrl } = await chrome.storage.local.get("appUrl");
  const base = (appUrl || DEFAULT_APP_URL).replace(/\/$/, "");
  chrome.tabs.create({ url: `${base}/contracts/${lastContractId}` });
});

document.getElementById("capture-another").addEventListener("click", () => {
  document.getElementById("contract-title").value = "";
  document.getElementById("contract-type").value = "";
  document.getElementById("contract-start").value = "";
  document.getElementById("contract-end").value = "";
  document.getElementById("contract-value").value = "";
  document.getElementById("contract-currency").value = "USD";
  document.getElementById("contract-status").value = "draft";
  document.getElementById("contract-owner").value = "";
  document.getElementById("contract-auto-renew").checked = false;
  document.getElementById("contract-description").value = "";
  document.getElementById("contract-notes").value = "";
  document.getElementById("new-vendor-name").value = "";
  document.getElementById("new-vendor-contact-name").value = "";
  document.getElementById("new-vendor-contact-email").value = "";
  document.getElementById("new-vendor-contact-phone").value = "";
  document.getElementById("new-vendor-address").value = "";
  selectedVendor = null;
  document.getElementById("vendor-selected").classList.add("hidden");
  showView("capture");
  prefillFromActiveTab();
});

document.getElementById("open-options").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

init();
