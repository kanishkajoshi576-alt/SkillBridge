# SkillBridge

SkillBridge is a mobile-first, installable React PWA for peer-to-peer skill sharing, backed by a Java Spring Boot REST API and MySQL.

## What is implemented

- Account registration and login using Spring Security, BCrypt password hashes and signed JWTs.
- Profile and teach/learn skill storage, database-backed complementary match scores, exchange requests and accept/reject flow.
- Near-real-time REST-refreshed messaging for accepted exchanges, unread counts and read receipts, timezone-aware session scheduling/rescheduling with conflict and declared-availability checks, month/week calendars, saved learning progress and reviews gated on completed sessions.
- A free Study Library with topic-based YouTube video discovery and progress tracking linked to each learner’s saved learning paths. Videos open on YouTube; SkillBridge does not host or verify third-party lessons.
- Persistent safety reports, user blocking, server-enforced profile/request/message privacy settings, notification records, a paginated community feed with posts/comments/likes/reporting, an admin moderation dashboard/audit trail, and an AI doubt-solver integration that only responds when a server-side AI provider is configured.
- Community guidelines, privacy and terms pages; persistent AI conversation history; profile ratings and completed-session counts.
- Responsive desktop/mobile navigation, login and registration, welcome dashboard, searchable match cards, loading/error/empty states, safety consent before a first exchange request and a PWA app shell.
- Session calendar with month navigation, dedicated explore/session routes, and email one-time-code password reset when SMTP is configured.
- Lessons, peer exchange and progress tracking are free. Optional verified-profile reviews and assessed certificates are future business-model ideas only; there is no checkout, fee, verification service, or certificate issuance yet.

## Run the frontend

```powershell
npm install
npm run dev
```

The Vite app runs at `http://localhost:5173`. Standard web and Android modes use Firebase Authentication and Cloud Firestore for registration, sign-in, password resets, learner profiles, skill discovery, exchange requests, and live conversations. They also include learning goals and progress, session proposals and responses, a monthly calendar, profile completion, and public safety and privacy information. The existing Spring API flows remain in the Windows desktop app and faculty demo mode.

Before using Firebase web mode, open the `skillbridge-fba36` project in the Firebase console:

1. In **Authentication > Sign-in method**, enable **Email/Password** and **Google**. Set a support email for the Google provider when prompted.
2. In **Firestore Database**, create a database and choose its location.
3. Open **Firestore Database > Rules**, replace the starter rules with the contents of [`firestore.rules`](firestore.rules), and publish them. These rules restrict profile edits and learning goals to their owner, exchange requests to their participants, and conversations and sessions to their participants. The rules also allow only the other conversation participant to mark an incoming message as read; deploy the updated rules for read receipts to work.
4. In **Authentication > Settings > Authorized domains**, ensure `localhost` and your deployed web domain are listed.

The Firebase web configuration in `src/firebase.js` is a client identifier, not an administrative secret. Keep Firebase security rules enabled and never put service-account credentials in the web app. For local development, start the frontend with `npm run dev`; set `VITE_AUTH_MODE=api` in a local `.env.local` file to opt back into the legacy Spring API web experience. `npm run dev:demo` continues to use the isolated Spring demo flow.

To exercise Firebase flows without changing production data, run the Auth and Firestore emulators from the project root and start Vite with `VITE_USE_FIREBASE_EMULATORS=true npm run dev`. The emulator option is off by default; local emulator accounts and records are separate from the deployed Firebase project.

Set `VITE_API_URL` if the Spring API is hosted somewhere other than `http://localhost:8080/api`.

## Install the Windows desktop app

The Windows app opens in its own application window; it does not require opening the website. It starts a private local API service, creates the existing SkillBridge sample learners and exchanges the first time it runs, and saves the database on this computer so learner activity remains after closing the app.

Download and run `SkillBridge-Setup-1.0.2.exe` from the project's `release` folder. On first launch, set up SMTP email delivery in the app. A six-digit, one-time code is emailed at each login; codes are hashed in the database, expire after 10 minutes, and are limited to five attempts. For Gmail, use `smtp.gmail.com`, port `587`, and a Google App Password. SMTP credentials are encrypted with Windows secure storage. The included sample accounts use non-deliverable `@demo.skillbridge.local` addresses, so enter an inbox in the optional demo-code field to receive their sign-in codes; new accounts receive codes at their own email addresses. Sample data is stored in the user's local SkillBridge application-data folder and is preserved when updating. The installer closes both the app and its bundled local service before replacing files.

To build the installer from source on Windows with Node.js, Maven, and Java 17 or newer installed, run:

```powershell
npm install
npm run build:desktop
```

The installer is written to `release\SkillBridge-Setup-1.0.2.exe`. It contains the app, backend, and a private Java runtime; users do not need to install Java, Maven, Node.js, Android Studio, or a database.

## Build the Android app

SkillBridge includes an Android app built with Capacitor. It uses the Firebase web experience, so sign-up, profiles, exchanges, messaging, learning goals, and sessions do not require a separate Spring API server. For native Google sign-in, register an Android app with package name `com.skillbridge.app` in Firebase, add the debug/release signing SHA fingerprints in Firebase project settings, enable Google in Authentication, and place the downloaded `google-services.json` at `android\app\google-services.json`. The Android Google flow uses the native account picker and returns to the app without a browser session-state redirect. Email/password auth remains available without the native Google configuration. Configure and publish Firestore rules above before using the app. Install Android Studio with the Android SDK and an Android emulator or device, then:

```powershell
npm install
npm run build:android
npm run android
```

In Android Studio, wait for Gradle sync, select an emulator or connected device, and press **Run**. To create an APK, choose **Build > Build Bundle(s) / APK(s) > Build APK(s)**. Java 21 is required. In PowerShell, set `JAVA_HOME` to your JDK 21 installation before building from the command line:

```powershell
$env:JAVA_HOME = "C:\path\to\jdk-21"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
cd .\android
.\gradlew.bat assembleDebug
```

Android Studio is optional for building from PowerShell; install it if you want to run the app in its emulator or use the visual Android project editor.

The debug APK is written to `android\app\build\outputs\apk\debug\app-debug.apk`. It is labeled **SkillBridge** (version 1.3.4), has a centered launcher icon and animated branded loading screens, keeps Firebase authentication persisted across app restarts, restores the signed-in workspace before the profile finishes loading, and provides a boot recovery prompt if the web app fails to mount. Camera and microphone permissions are requested by Android only when a call first uses them; broad storage permission is not required for calls. Accepted sessions can create or join an embedded Jitsi call. If moderator sign-in is blocked inside the app, use **Open in browser** to join the same room in the system browser; keep that browser call open for the meeting. The public `meet.jit.si` service may require a moderator to authenticate before the room starts, and app configuration cannot bypass that hosted-service policy. Call rooms are random, but anyone with the room link may be able to join, so share it privately. Learners can submit teaching-verification requests with qualifications and an optional HTTPS evidence link. These requests remain private and pending until an administrator review process is configured; there is no admin panel yet. The evidence link is stored in Firestore, not uploaded to Firebase Storage. Deploy the updated `firestore.rules` from the Firebase Console for these features. Signing out clears both web and native sessions and returns to the sign-in screen. Native apps do not register the web app’s service worker, avoiding stale cached app shells after an update. The debug APK is for testing; use a signed release build before publishing it.

On Windows, keep Android build files outside OneDrive if Capacitor reports `EPERM` while syncing generated Android assets; OneDrive Files On-Demand can prevent the native build from replacing generated files.

## Faculty demo mode

For the step-by-step setup and presentation path, see [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md).

Demo mode uses an isolated in-memory H2 database, so it needs no MySQL or Docker and resets sample data whenever the backend stops. Build the API with `mvn -f .\backend\pom.xml -DskipTests package`, start `.\run-demo-backend.ps1` from the project root, then run `npm run dev:demo` in a second terminal. Sign in with any of the 44 accounts listed in [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md); all use the shared password `SkillBridgeDemo2026!`. Login also requires working SMTP settings because the app sends a one-time email code; for demo addresses, configure `DEMO_OTP_RECIPIENT` to an inbox you can access.

The seeder requires both the Spring `demo` profile and `SKILLBRIDGE_DEMO_SEED_ENABLED=true`. It creates 44 labeled demo accounts, complementary teaching and learning skills, 22 accepted connections with inbox conversations, upcoming and completed sessions, weekly availability, learning progress, and community posts with comments and likes. Every demo learner has profile skills, an exchange with messages, availability, progress, one completed session, and two upcoming calendar plans. Maya's dashboard includes progress paths for all her learning skills, and her calendar contains multiple personal plans. Reviews, notifications, and analytics are not seeded. Demo logins require SMTP; configure `DEMO_OTP_RECIPIENT` to send codes for the reserved `@demo.skillbridge.local` accounts to an inbox you control. Use ordinary `run-backend.ps1` and `npm run dev` for non-demo development.

## Run the Spring Boot API

Install Java 17+ and Maven, create a MySQL database/user, then configure the environment variables listed in `backend/.env.example`. `SKILLBRIDGE_JWT_SECRET` must contain at least 32 characters; use a unique random value outside local development.

On Windows, run the API from the project root with the secure local launcher. It prompts for the `skillbridge` database user's password without echoing it or adding it to command history, and generates a fresh JWT secret for that run:

```powershell
.\run-backend.ps1
```

Keep that terminal open while using the app. If PowerShell blocks the script, run it for that terminal only with:

```powershell
powershell -ExecutionPolicy Bypass -File .\run-backend.ps1
```

Stop any already-running backend in its terminal before starting a replacement; only one API process can use port 8080.

Alternatively, start the backend manually:

```powershell
cd backend
$env:DATABASE_URL = "jdbc:mysql://localhost:3307/skillbridge?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
$env:DATABASE_USERNAME = "skillbridge"
$env:DATABASE_PASSWORD = "<your-local-database-password>"
$env:SKILLBRIDGE_JWT_SECRET = "<a-unique-random-secret-of-at-least-32-characters>"
mvn spring-boot:run
```

MySQL can optionally be started with `docker compose up -d mysql` from `backend` after setting `DATABASE_PASSWORD` and `MYSQL_ROOT_PASSWORD`. The backend creates/updates its tables with Hibernate for local development.

To enable the AI helper, configure `AI_BASE_URL`, `AI_API_KEY` and `AI_MODEL` on the server. The backend uses an OpenAI-compatible `/v1/chat/completions` endpoint; keys never go to the browser. Without these settings, the API returns a visible service-unavailable error rather than a made-up answer.

To enable **Forgot your password**, the Windows launcher optionally prompts for the SMTP host, port, username, an SMTP/app password (entered without echo), and sender address. Press Enter at the SMTP-host prompt to skip email setup. For manual starts, configure `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, and `MAIL_FROM` in the backend environment before starting it; `MAIL_SMTP_AUTH` and `MAIL_SMTP_STARTTLS` default to `true`. Reset codes are stored as password hashes, expire after ten minutes, allow at most five attempts, are single-use, and have a per-account resend cooldown. Until SMTP is configured, the page reports that email delivery is unavailable.

Email verification is optional for development. Set `EMAIL_VERIFICATION_REQUIRED=true` and configure SMTP plus `FRONTEND_URL` to require it. Registration then sends a single-use, hashed 24-hour verification token; users cannot sign in until the verification link is used. The token is carried in the link fragment so it is not sent in normal HTTP requests or referrer headers. If verification is required but SMTP is unavailable, registration fails clearly instead of activating an unverified account.

Users can manage weekly availability from Profile. Slots include weekday, local start/end time, timezone, mode, and preferred duration. If a user has saved slots, sessions must fit both participants' availability. The scheduler can submit an explicit availability override when both participants have agreed to a different time. Discovery can filter by skill offered, skill wanted, and available weekday; results remain paginated.

Accepted upcoming sessions produce backend notification reminders near 24 hours and one hour before their scheduled start. Reminder notifications are deduplicated per participant and session.

Set `CORS_ALLOWED_ORIGINS` to a comma-separated list of trusted frontend origins for deployment. The local defaults allow the Vite development server and the local Capacitor app origins. The match endpoint supports server-paged results (`page`, `size`, and `sort=match|name`) and returns `{ items, page, size, totalItems, totalPages }`; the UI requests 12 results at a time. Message updates use a five-second REST refresh while the chat is visible, so the app remains usable without a WebSocket service. API errors use a consistent envelope with a safe message, timestamp, code, and validation details.

## Notes

- No sample accounts, matches, reviews, messages, or statistics are seeded.
- Run the end-to-end backend flow test with `mvn test` from `backend`; it uses an isolated H2 test database. Runtime configuration remains MySQL.
- Password recovery by one-time email code requires a configured mail provider. Email verification is implemented but optional by default. Community events, uploaded profile photos/attachments, online presence, WebSocket delivery, advanced rating/recent-activity matching, self-service account deletion/data export, and payments are not implemented.
- Admin endpoints require a user with the `ADMIN` role; registration cannot grant admin privileges. Do not treat a profile skill as verified.
- Configure HTTPS, production CORS origins, a secrets manager, database backups, email delivery, and rate limiting before public deployment.
