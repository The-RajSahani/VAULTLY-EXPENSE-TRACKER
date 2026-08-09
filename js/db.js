// ============================================================
// FIRESTORE DATA LAYER
// Data model (all scoped under /users/{uid} for isolation):
//   users/{uid}                         -> profile fields
//   users/{uid}/transactions/{txId}     -> a single income/expense entry
//   users/{uid}/categories/{catId}      -> custom categories
//   users/{uid}/meta/budget             -> { amount, categoryBudgets: [] }
// ============================================================
import { db, storage } from "./firebase-config.js";
import {
  doc, setDoc, updateDoc, deleteDoc, getDoc,
  collection, addDoc, onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { state } from "./state.js";

function uidPath(...parts) {
  return [`users/${state.user.uid}`, ...parts].join("/");
}

// ---------- Profile ----------
export async function ensureUserDoc(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      name: user.displayName || "",
      email: user.email,
      photoURL: user.photoURL || "",
      currency: "INR",
      language: "en",
      theme: "dark",
      notifications: { budget: true, daily: false, monthly: true, success: true },
      createdAt: serverTimestamp()
    });
  }
  return (await getDoc(userRef)).data();
}

export async function updateUserDoc(fields) {
  await updateDoc(doc(db, "users", state.user.uid), fields);
}

// ---------- Transactions ----------
export function listenTransactions(callback) {
  const q = query(collection(db, "users", state.user.uid, "transactions"), orderBy("date", "desc"));
  const unsub = onSnapshot(q, (snap) => {
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    callback(list);
  }, (err) => console.error("transactions listener error", err));
  state.unsubscribers.push(unsub);
  return unsub;
}

export async function addTransaction(data) {
  return addDoc(collection(db, "users", state.user.uid, "transactions"), {
    ...data,
    createdAt: serverTimestamp()
  });
}

export async function updateTransaction(id, data) {
  return updateDoc(doc(db, "users", state.user.uid, "transactions", id), data);
}

export async function deleteTransaction(id) {
  return deleteDoc(doc(db, "users", state.user.uid, "transactions", id));
}

// ---------- Receipt upload ----------
export async function uploadReceipt(file, txId) {
  const path = `receipts/${state.user.uid}/${txId || Date.now()}_${file.name}`;
  const r = ref(storage, path);
  await uploadBytes(r, file);
  return getDownloadURL(r);
}

// ---------- Custom categories ----------
export function listenCategories(callback) {
  const q = collection(db, "users", state.user.uid, "categories");
  const unsub = onSnapshot(q, (snap) => {
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data(), custom: true }));
    callback(list);
  });
  state.unsubscribers.push(unsub);
  return unsub;
}

export async function addCategory(name, color) {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) + "-" + Date.now().toString(36);
  await setDoc(doc(db, "users", state.user.uid, "categories", id), {
    name, color, icon: "fa-tag", type: "both"
  });
  return id;
}

export async function deleteCategory(id) {
  return deleteDoc(doc(db, "users", state.user.uid, "categories", id));
}

// ---------- Budget ----------
export function listenBudget(callback) {
  const ref_ = doc(db, "users", state.user.uid, "meta", "budget");
  const unsub = onSnapshot(ref_, (snap) => {
    callback(snap.exists() ? snap.data() : { amount: 0, categoryBudgets: [] });
  });
  state.unsubscribers.push(unsub);
  return unsub;
}

export async function setBudget(amount) {
  await setDoc(doc(db, "users", state.user.uid, "meta", "budget"), { amount }, { merge: true });
}

export async function setCategoryBudgets(categoryBudgets) {
  await setDoc(doc(db, "users", state.user.uid, "meta", "budget"), { categoryBudgets }, { merge: true });
}
