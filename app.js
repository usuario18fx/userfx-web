const accessCodeSuffix = document.getElementById("accessCodeSuffix");
const unlockBtn = document.getElementById("unlockBtn");
const unlockMsg = document.getElementById("unlockMsg");
const lockOverlayEl = document.getElementById("lockOverlay");

const ACCESS_CODE_PREFIX = "FX-USER01-";

function setMessage(text, ok = false) {
  if (!unlockMsg) return;
  unlockMsg.textContent = text;
  unlockMsg.style.color = ok
    ? "rgba(0, 242, 255, 0.95)"
    : "rgba(255, 255, 255, 0.84)";
}

function unlockAlbumUI() {
  if (lockOverlayEl) {
    lockOverlayEl.remove();
  }
  localStorage.setItem("fx_album_unlocked", "1");
}

async function validateAccessCode(prefix, suffix) {
  const response = await fetch("/api/unlock", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prefix,
      suffix,
    }),
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || "Unable to validate code.");
  }

  return data;
}

async function handleUnlock() {
  const suffix = (accessCodeSuffix?.value || "").trim().toUpperCase();

  if (!suffix || suffix.length !== 4) {
    setMessage("Enter the last 4 characters.");
    accessCodeSuffix?.focus();
    return;
  }

  unlockBtn.disabled = true;
  unlockBtn.style.opacity = "0.7";
  setMessage("Checking code...");

  try {
    const result = await validateAccessCode(ACCESS_CODE_PREFIX, suffix);

    if (!result?.ok) {
      setMessage(result?.error || "Invalid code.");
      return;
    }

    setMessage("Album unlocked.", true);
    unlockAlbumUI();
  } catch (error) {
    setMessage(error?.message || "Unable to validate code.");
  } finally {
    unlockBtn.disabled = false;
    unlockBtn.style.opacity = "1";
  }
}

if (localStorage.getItem("fx_album_unlocked") === "1") {
  unlockAlbumUI();
}

unlockBtn?.addEventListener("click", handleUnlock);

accessCodeSuffix?.addEventListener("input", () => {
  accessCodeSuffix.value = accessCodeSuffix.value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);

  if (unlockMsg?.textContent) {
    setMessage("");
  }
});

accessCodeSuffix?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleUnlock();
  }
});
