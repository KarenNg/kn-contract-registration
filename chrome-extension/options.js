const input = document.getElementById("app-url");
const savedLabel = document.getElementById("saved");

chrome.storage.local.get("appUrl").then(({ appUrl }) => {
  input.value = appUrl || DEFAULT_APP_URL;
});

document.getElementById("save").addEventListener("click", async () => {
  const value = input.value.trim().replace(/\/$/, "");
  await chrome.storage.local.set({ appUrl: value || DEFAULT_APP_URL });
  savedLabel.style.display = "inline";
  setTimeout(() => (savedLabel.style.display = "none"), 1500);
});
