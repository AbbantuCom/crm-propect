/**
 * Sets a user's role via Firebase custom claims. Use this once to bootstrap
 * your first super admin (before anyone exists who can use the Team page).
 *
 * Usage:
 *   node scripts/set-role.js someone@example.com superadmin
 *
 * Requires the same FIREBASE_ADMIN_* env vars as the app (loaded from .env.local).
 */
require("dotenv").config({ path: ".env.local" });
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const [, , email, role] = process.argv;
const VALID_ROLES = ["staff", "admin", "superadmin"];

if (!email || !VALID_ROLES.includes(role)) {
  console.error("Usage: node scripts/set-role.js <email> <staff|admin|superadmin>");
  process.exit(1);
}

const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n");

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey,
  }),
});

async function main() {
  const auth = getAuth(app);
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (err) {
    console.error(`No Firebase user found for ${email}.`);
    console.error("Create the user first in the Firebase console (Authentication > Users > Add user), then rerun this script.");
    process.exit(1);
  }

  await auth.setCustomUserClaims(user.uid, { role });
  console.log(`Done. ${email} is now "${role}".`);
  process.exit(0);
}

main();
