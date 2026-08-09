// ============================================================
// PROFILE
// ============================================================
import { $, showToast, setBtnLoading, confirmDialog, sanitizeInput } from "./utils.js";
import { state } from "./state.js";
import { updateUserDoc } from "./db.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { storage } from "./firebase-config.js";
import { setDisplayName, changeUserEmail, changeUserPassword, deleteUserAccount, setPhotoURL, logout } from "./auth.js";

export function initProfile() {
  $("#profile-photo-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const path = `avatars/${state.user.uid}/${Date.now()}_${file.name}`;
      const r = ref(storage, path);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      await setPhotoURL(url);
      await updateUserDoc({ photoURL: url });
      renderProfile();
      showToast("Profile photo updated.", "success");
    } catch (err) {
      showToast("Couldn't upload photo.", "error");
    }
  });

  $("#update-name-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    const name = sanitizeInput($("#update-name-input").value);
    if (!name) return;
    setBtnLoading(btn, true);
    try {
      await setDisplayName(name);
      await updateUserDoc({ name });
      showToast("Name updated.", "success");
      renderProfile();
    } catch (err) { showToast("Couldn't update name.", "error"); }
    finally { setBtnLoading(btn, false); }
  });

  $("#update-email-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    const email = sanitizeInput($("#update-email-input").value);
    const password = $("#update-email-password").value;
    setBtnLoading(btn, true);
    try {
      await changeUserEmail(email, password);
      await updateUserDoc({ email });
      showToast("Email updated.", "success");
      e.target.reset();
      renderProfile();
    } catch (err) { showToast(err.code === "auth/wrong-password" || err.code === "auth/invalid-credential" ? "Incorrect password." : "Couldn't update email.", "error"); }
    finally { setBtnLoading(btn, false); }
  });

  $("#update-password-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    const current = $("#current-password-input").value;
    const next = $("#new-password-input").value;
    if (next.length < 8) return showToast("New password must be at least 8 characters.", "error");
    setBtnLoading(btn, true);
    try {
      await changeUserPassword(current, next);
      showToast("Password changed.", "success");
      e.target.reset();
    } catch (err) { showToast(err.code === "auth/wrong-password" || err.code === "auth/invalid-credential" ? "Incorrect current password." : "Couldn't change password.", "error"); }
    finally { setBtnLoading(btn, false); }
  });

  $("#delete-account-btn").addEventListener("click", async () => {
    const ok = await confirmDialog("Delete your account?", "All your transactions and data will be permanently erased. This cannot be undone.");
    if (!ok) return;
    const password = prompt("For security, please re-enter your password:");
    if (!password) return;
    try {
      await deleteUserAccount(password);
      showToast("Account deleted.", "success");
    } catch (err) {
      showToast("Couldn't delete account — check your password.", "error");
    }
  });
}

export function renderProfile() {
  const user = state.user;
  if (!user) return;
  const name = state.profile?.name || user.displayName || "Vaultly user";
  $("#profile-name-display").textContent = name;
  $("#profile-email-display").textContent = user.email;
  $("#update-name-input").value = name;
  $("#update-email-input").value = "";
  $("#profile-verified-badge").classList.toggle("hidden", !user.emailVerified);

  const photoURL = state.profile?.photoURL || user.photoURL;
  [["#profile-avatar", "#profile-avatar-fallback"], ["#topbar-avatar", "#topbar-avatar-fallback"]].forEach(([imgSel, fallbackSel]) => {
    const img = $(imgSel), fallback = $(fallbackSel);
    if (photoURL) {
      img.src = photoURL; img.classList.remove("hidden"); fallback.classList.add("hidden");
    } else {
      img.classList.add("hidden"); fallback.classList.remove("hidden");
    }
  });
}
