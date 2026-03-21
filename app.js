const accessCodePrefix = document.getElementById("accessCodePrefix");
const accessCodeSuffix = document.getElementById("accessCodeSuffix");
const unlockBtn = document.getElementById("unlockBtn");
const unlockMsg = document.getElementById("unlockMsg");
const lockOverlayEl = document.getElementById("lockOverlay");

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
    body: JSON.stringify({ prefix, suffix }),
  });

  return response.json();
}

if (localStorage.getItem("fx_album_unlocked") === "1") {
  unlockAlbumUI();
}

if (unlockBtn && accessCodePrefix && accessCodeSuffix) {
  unlockBtn.addEventListener("click", async () => {
    const prefix = accessCodePrefix.value.trim().toUpperCase();
    const suffix = accessCodeSuffix.value.trim().toUpperCase();

    if (!suffix || suffix.length !== 4) {
      if (unlockMsg) unlockMsg.textContent = "Enter the last 4 characters.";
      return;
    }

    if (unlockMsg) unlockMsg.textContent = "Checking...";

    try {
      const result = await validateAccessCode(prefix, suffix);

      if (!result.ok) {
        if (unlockMsg) unlockMsg.textContent = result.error || "Invalid code.";
        return;
      }

      unlockAlbumUI();

      if (unlockMsg) unlockMsg.textContent = "Access unlocked.";
    } catch (error) {
      console.error("UNLOCK CLIENT ERROR:", error);
      if (unlockMsg) unlockMsg.textContent = "Error validating code.";
    }
  });

  accessCodeSuffix.addEventListener("input", () => {
    accessCodeSuffix.value = accessCodeSuffix.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 4);
  });
}