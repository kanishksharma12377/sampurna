## Quick Start (Windows)

Very simple steps to install and run the website and the (optional) local database.

1) Install tools and packages

```powershell
npm install -g firebase-tools
npm install
```

2) Run the website (and receipt API)

```powershell
npm run start:server
# Opens http://localhost:3001 and serves the frontend from the "public" folder
# Also exposes POST /api/generate-receipt for PDF receipts
```

3) Optional: Use Firestore Emulator (no cloud)

```powershell
# Start the emulator (port 8080)
npm run emulators

# Seed demo data (run in new terminal while emulator is running)
$env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"; $env:SAMPURNA_APP_ID="smapurna-e9c2b"; npm run seed:firestore

# Tip: to make Admin use the emulator, uncomment the flag in public/admin-panel.html
# <script>window.USE_FIRESTORE_EMULATOR = true;</script>
```

4) Open the app

- Website: http://localhost:3001/login.html
- Admin Panel: http://localhost:3001/admin-panel.html
- Student Panel: http://localhost:3001/student-panel.html

Notes
- You can also connect to your real Firestore by not starting the emulator and keeping the flag commented out.
- Press Ctrl+C in the terminal to stop the server and emulator.
