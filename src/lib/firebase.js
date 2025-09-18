
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
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
