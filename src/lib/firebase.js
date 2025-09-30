
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref as fbRef, set, update, remove, get, onValue } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCPmRSKOCPQf0pEaNoPuC33WbG0NyX6oa0",
  authDomain: "studio-7196860188-87957.firebaseapp.com",
  databaseURL: "https://studio-7196860188-87957-default-rtdb.firebaseio.com",
  projectId: "studio-7196860188-87957",
  storageBucket: "studio-7196860188-87957.firebasestorage.app",
  messagingSenderId: "853903303824",
  appId: "1:853903303824:web:eb6981a72ba2cdbcc5e415",
  measurementId: "G-W2Q84CNYVS"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const database = getDatabase(app);
const analytics = getAnalytics(app);

export { app, database, analytics };

/*

// --- Session helper ---
function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem("auth"));
  } catch {
    return null;
  }
}

// --- Custom ref wrapper ---
function ref(db, path = "") {
  const session = getSession();
  
  if (!session || session.type === "admin") {
    // admin (or no session) → use path as is
    return fbRef(db, path);
  }
  
  if (session.type === "user") {
    const email = session.user?.email;
    if (!email) return fbRef(db, path);
    
    // take only the part before @
    let username = email.split("@")[0];
    // sanitize username for Firebase path
    username = username.replace(/[.#$/\[\]\/]/g, "_");
    
    // prepend @username
    const base = `@${username}`;
    
    return fbRef(db, `${base}/${path}`);
  }
  
  return fbRef(db, path);
}

// --- Exports ---
export { app, database, analytics, ref, set, update, remove, get, onValue };
*/
