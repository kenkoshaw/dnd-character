# Firebase setup (one-time, ~10 minutes)

1. Go to https://console.firebase.google.com → **Add project** (any name, Analytics off).
2. Build → **Realtime Database** → Create database → choose region → **locked mode**.
3. Rules tab → paste the contents of `database.rules.json`, replacing
   `CHANGE_ME_SITE_PASSWORD` with your group's site password → **Publish**.
4. Project settings (gear) → **Your apps** → Web app (`</>`) → register (no hosting).
5. Copy the `firebaseConfig` object it shows into `js/config.js`.
6. Do NOT commit a real password into `database.rules.json` if the repo is public —
   the file in git keeps the placeholder; the real value lives only in the console.
