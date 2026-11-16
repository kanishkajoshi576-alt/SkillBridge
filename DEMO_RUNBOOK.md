# SkillBridge faculty demo runbook

## Start the isolated demo

1. From the project root, build and start the backend:

   ```powershell
   mvn -f .\backend\pom.xml -DskipTests package
   .\run-demo-backend.ps1
   ```

   The demo uses an isolated in-memory H2 database; no MySQL or Docker is required. The script securely prompts for SMTP settings and hides the app-password entry; for Gmail, use `smtp.gmail.com`, port `587`, your Gmail address, and a Google App Password. Enter an inbox you can access as the demo OTP recipient. The password is only held in process memory while the backend runs and is not saved in the project. Leave this terminal running. Sample data is recreated on each start and discarded when the backend stops.

2. In a second terminal, start the demo frontend:

   ```powershell
   npm run dev:demo
   ```

3. Open [http://localhost:5173](http://localhost:5173) on this laptop and sign in with one of the sample accounts below. Use two browser profiles or a private window to sign in as different learners.

   - Email: use any of the 44 accounts listed below
   - Password: `SkillBridgeDemo2026!`

   ```text
   maya@demo.skillbridge.local       arjun@demo.skillbridge.local
   lila@demo.skillbridge.local       noah@demo.skillbridge.local
   riya@demo.skillbridge.local       ethan@demo.skillbridge.local
   priya@demo.skillbridge.local      jules@demo.skillbridge.local
   mateo@demo.skillbridge.local      caleb@demo.skillbridge.local
   aisha@demo.skillbridge.local      samira@demo.skillbridge.local
   oliver@demo.skillbridge.local     zoe@demo.skillbridge.local
   nina@demo.skillbridge.local       marcus@demo.skillbridge.local
   farah@demo.skillbridge.local      daniel@demo.skillbridge.local
   grace@demo.skillbridge.local      leo@demo.skillbridge.local
   ishaan@demo.skillbridge.local     sofia@demo.skillbridge.local
   amara@demo.skillbridge.local      ben@demo.skillbridge.local
   mei@demo.skillbridge.local        ravi@demo.skillbridge.local
   elena@demo.skillbridge.local      jayden@demo.skillbridge.local
   mina@demo.skillbridge.local      andre@demo.skillbridge.local
   pooja@demo.skillbridge.local     callum@demo.skillbridge.local
   hannah@demo.skillbridge.local    isaac@demo.skillbridge.local
   noor@demo.skillbridge.local      james@demo.skillbridge.local
   camille@demo.skillbridge.local   diego@demo.skillbridge.local
   stella@demo.skillbridge.local    max@demo.skillbridge.local
   imani@demo.skillbridge.local     peter@demo.skillbridge.local
   ```

## Run the Android app against demo data

1. Follow step 1 above and leave the demo backend running.
2. Install Android Studio with the Android SDK and create or start an Android emulator.
3. From the project root, run `npm install`, then `npm run build:android` and `npm run android`.
4. In Android Studio, wait for Gradle sync, select the emulator, and press **Run**. For an APK, use **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
5. Sign in with any demo account above. The Android emulator reaches the backend on the host computer through `10.0.2.2:8080`.

## Suggested presentation flow

1. Sign in as Maya to browse all 43 other sample learners and their complementary skills.
2. Open My exchanges to show the seeded, accepted connection.
3. In the two browser profiles, send and receive a real message.
4. Set weekly availability in Profile, then schedule a session that fits it. Show that an out-of-slot proposal is rejected unless availability override is explicitly checked.
5. Have the other learner accept the proposal, then show the session on the calendar and the progress form.
6. Show the AI helper only if an AI provider is configured. Without one, the app correctly reports that the service is unavailable; it does not generate sample answers.

The demo seeder creates 44 clearly labeled users across complementary skill areas, with sample photos, fictional phone numbers, self-reported sample certificates, ratings, and skills to teach and learn. It also seeds accepted connections with inbox conversations, upcoming and completed sessions, weekly availability, learning progress, and community posts with comments and likes. Maya's demo dashboard has 9 teaching skills, 8 learning skills, 8 active exchanges, 9 completed sessions, and 8 upcoming plans, with a matching calendar and learning paths. Demo profile phone numbers are fictional and visible only because the demo explicitly opts into phone visibility; regular accounts keep phone numbers private by default. It only seeds when both the `demo` Spring profile and `SKILLBRIDGE_DEMO_SEED_ENABLED=true` are set. Demo logins still require a real one-time code: configure SMTP and `DEMO_OTP_RECIPIENT` to deliver codes for the reserved `@demo.skillbridge.local` addresses to an inbox you control.

For regular local use, run `run-backend.ps1` and `npm run dev`; those commands do not activate the demo seeder or display demo credentials.
