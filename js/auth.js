// ============================================================
// AUTHENTICATION
// ============================================================
import { auth, setPersistence, browserLocalPersistence, browserSessionPersistence } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail, sendEmailVerification, updateProfile,
  reauthenticateWithCredential, EmailAuthProvider, updateEmail, updatePassword,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { $, $$, showToast, setBtnLoading, sanitizeInput } from "./utils.js";

function showAuthForm(id) {
  $$(".auth-form").forEach(f => f.classList.add("hidden"));
  $(`#${id}`).classList.remove("hidden");
}

export function initAuthUI() {
  $("#go-register").addEventListener("click", (e) => { e.preventDefault(); showAuthForm("register-form"); });
  $("#go-login").addEventListener("click", (e) => { e.preventDefault(); showAuthForm("login-form"); });
  $("#go-forgot").addEventListener("click", (e) => { e.preventDefault(); showAuthForm("forgot-form"); });
  $("#back-to-login-from-forgot").addEventListener("click", (e) => { e.preventDefault(); showAuthForm("login-form"); });

  $$(".pw-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = $("#" + btn.dataset.target);
      const isPw = target.type === "password";
      target.type = isPw ? "text" : "password";
      btn.innerHTML = isPw ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
    });
  });

  // Password strength meter
  $("#register-password").addEventListener("input", (e) => {
    const val = e.target.value;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    const bar = $("#pw-strength span");
    const pct = (score / 4) * 100;
    bar.style.width = pct + "%";
    bar.style.background = score <= 1 ? "var(--coral)" : score <= 2 ? "var(--amber)" : "var(--teal)";
  });

  // ---------- Register ----------
  $("#register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    const name = sanitizeInput($("#register-name").value);
    const email = sanitizeInput($("#register-email").value);
    const password = $("#register-password").value;
    if (password.length < 8) return showToast("Password must be at least 8 characters.", "error");

    setBtnLoading(btn, true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await sendEmailVerification(cred.user);
      $("#verify-email-addr").textContent = email;
      showAuthForm("verify-notice");
      showToast("Account created! Check your inbox to verify your email.", "success");
    } catch (err) {
      showToast(friendlyAuthError(err), "error");
    } finally {
      setBtnLoading(btn, false);
    }
  });

  // ---------- Login ----------
  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    const email = sanitizeInput($("#login-email").value);
    const password = $("#login-password").value;
    const remember = $("#login-remember").checked;

    setBtnLoading(btn, true);
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!cred.user.emailVerified) {
        $("#verify-email-addr").textContent = email;
        showAuthForm("verify-notice");
        setBtnLoading(btn, false);
        return;
      }
      showToast(`Welcome back, ${cred.user.displayName || "there"}!`, "success");
    } catch (err) {
      showToast(friendlyAuthError(err), "error");
    } finally {
      setBtnLoading(btn, false);
    }
  });

  // ---------- Forgot password ----------
  $("#forgot-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    const email = sanitizeInput($("#forgot-email").value);
    setBtnLoading(btn, true);
    try {
      await sendPasswordResetEmail(auth, email);
      showToast("Reset link sent — check your inbox.", "success");
      showAuthForm("login-form");
    } catch (err) {
      showToast(friendlyAuthError(err), "error");
    } finally {
      setBtnLoading(btn, false);
    }
  });

  // ---------- Verify email screen actions ----------
  $("#resend-verify").addEventListener("click", async () => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        showToast("Verification email resent.", "success");
      }
    } catch (err) { showToast(friendlyAuthError(err), "error"); }
  });

  $("#verify-check").addEventListener("click", async () => {
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        showToast("Email verified! Welcome to Vaultly.", "success");
      } else {
        showToast("Still not verified — check your inbox (and spam folder).", "warn");
      }
    } catch (err) { showToast(friendlyAuthError(err), "error"); }
  });

  $("#verify-logout").addEventListener("click", async (e) => {
    e.preventDefault();
    await signOut(auth);
    showAuthForm("login-form");
  });
}

export async function logout() {
  await signOut(auth);
}

// ---------- Profile management (used by profile.js) ----------
export async function reauthenticate(password) {
  const cred = EmailAuthProvider.credential(auth.currentUser.email, password);
  return reauthenticateWithCredential(auth.currentUser, cred);
}
export async function changeUserEmail(newEmail, password) {
  await reauthenticate(password);
  return updateEmail(auth.currentUser, newEmail);
}
export async function changeUserPassword(currentPassword, newPassword) {
  await reauthenticate(currentPassword);
  return updatePassword(auth.currentUser, newPassword);
}
export async function deleteUserAccount(password) {
  await reauthenticate(password);
  return deleteUser(auth.currentUser);
}
export async function setDisplayName(name) {
  return updateProfile(auth.currentUser, { displayName: name });
}
export async function setPhotoURL(url) {
  return updateProfile(auth.currentUser, { photoURL: url });
}

function friendlyAuthError(err) {
  const map = {
    "auth/email-already-in-use": "That email is already registered — try signing in instead.",
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/weak-password": "Please choose a stronger password (min 8 characters).",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password. Try again or reset it.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/requires-recent-login": "Please re-enter your password to confirm this change."
  };
  return map[err.code] || err.message || "Something went wrong. Please try again.";
}
