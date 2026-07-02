# WebDev CRM

Internal prospect CRM for WebDev. Next.js 14 (App Router), Firebase Authentication
(email/password), MongoDB for data, deployed on Vercel.

## What's included

- **Login** with Firebase email/password, session kept in an httpOnly cookie.
- **Three roles**, enforced on every API route, not just hidden in the UI:
  - `staff` — can view prospects, log calls, and add dated notes. Cannot create, edit, or
    delete prospects.
  - `admin` — everything staff can do, plus create/edit/delete prospects.
  - `superadmin` — everything admin can do, plus bulk-upload the prospect sheet and manage
    team accounts/roles.
- **Prospect list** with search, category filter, "has website / no website" filter,
  location filter, and pagination (20 per page).
- **Prospect detail page** with a call log and a dated notes timeline (many notes per
  prospect).
- **Bulk upload** of the Google Sheet export (.xlsx or .csv, ~1700 rows / 2MB) with
  automatic column matching for the format you're using (Company Name, Category, Address,
  P.O. Box, Tel, Mobile, WhatsApp, Email, Website, Contact Person, Designation,
  Products/Services, Brands, Facebook, Twitter).
- **Team page** (super admin only) to create accounts and change roles, no Firebase console
  visits needed after initial setup.

## 1. Firebase setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Project settings** → General → "Your apps" → add a Web app. Copy the config values into
   `NEXT_PUBLIC_FIREBASE_*` in your `.env.local`.
4. **Project settings** → Service accounts → **Generate new private key**. This downloads a
   JSON file. From it, copy:
   - `project_id` → `FIREBASE_ADMIN_PROJECT_ID`
   - `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_ADMIN_PRIVATE_KEY` (keep the `\n` characters, wrap the whole
     thing in quotes)

## 2. MongoDB setup

Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas) (or use any
MongoDB instance), create a database user, and copy the connection string into
`MONGODB_URI`. No manual schema setup needed, collections are created automatically.

## 3. Local setup

```bash
cp .env.example .env.local
# fill in .env.local with the values from steps 1 and 2
npm install
npm run dev
```

## 4. Bootstrap your first super admin

Nobody can grant roles before a super admin exists, so this one time it's done from the
command line instead of the Team page:

1. In the Firebase console → Authentication → Users → **Add user**, create your own account
   with an email and password.
2. Run:
   ```bash
   node scripts/set-role.js you@example.com superadmin
   ```
3. Log in at `/login`. You'll see the "Upload Sheet" and "Team" links in the nav, since
   you're now super admin. From the Team page you can create every other account (staff and
   admin) going forward, no more command line needed.

## 5. Upload the prospect sheet

As the super admin, go to **Upload Sheet**, and upload the `.xlsx` export of the Google
Sheet (File → Download → Microsoft Excel in Google Sheets), or a `.csv` export. Column
headers are matched automatically, so re-ordering or minor spelling differences (e.g. "P.O.
Box" vs "PO Box") are handled. Rows without a Company Name are skipped. The whole sheet
(1700+ rows) is imported in batches, this typically takes a few seconds.

Re-uploading the same sheet twice will create duplicate rows, since there's no unique key set
on Company Name. If you need de-duplication behavior, that's a small follow-up change.

## 6. Deploy to Vercel

1. Push this project to a GitHub repo.
2. In Vercel, **New Project** → import the repo.
3. Add all the same environment variables from `.env.local` in Vercel's Project Settings →
   Environment Variables (paste `FIREBASE_ADMIN_PRIVATE_KEY` exactly as it is in your `.env.local`,
   including the `\n` sequences and surrounding quotes).
4. Deploy. Vercel's Hobby plan allows request bodies up to 4.5MB, which comfortably covers a
   2MB sheet upload.

## Health check

A public endpoint (no login required) that confirms the server is running and the database is reachable. It returns the first prospect ever created as a quick data sanity check.

```
GET /api/health
```

**Local:**
```bash
curl http://localhost:3000/api/health
```

**Production:**
```bash
curl https://your-vercel-url.vercel.app/api/health
```

**Success response (`200`):**
```json
{ "ok": true, "db": "connected", "prospectCount": 1732 }
```

**Failure response (`500`):**
```json
{ "ok": false, "error": "connect ECONNREFUSED ..." }
```

## Notes on how roles work

Roles are stored as a Firebase **custom claim** on each user (not a separate database table),
set via the Team page or `scripts/set-role.js`. A role change takes effect the next time that
person logs in, or automatically within about an hour when their Firebase ID token refreshes.
If you need a role change to apply immediately, ask that person to log out and back in.

## Project structure

```
app/
  login/                   Login page
  (protected)/             Everything behind auth, guarded in layout.js
    dashboard/              Prospect list, filters, search, pagination
    prospects/[id]/          Prospect detail, notes, call log
    admin/upload/            Bulk sheet upload (super admin)
    admin/users/             Team management (super admin)
  api/
    session/                 Login/logout, sets the session cookie
    prospects/                CRUD for prospects (role-checked)
    prospects/[id]/notes/      Dated notes (staff can add)
    prospects/[id]/calls/      Call log (staff can add)
    upload/                    Bulk sheet import (super admin only)
    admin/users/               Create users / change roles (super admin only)
lib/                        Firebase client/admin, MongoDB connection, auth helpers
models/                     Mongoose schemas: Prospect, Note, Call
components/                 Client-side UI
scripts/set-role.js         One-time super admin bootstrap
```
