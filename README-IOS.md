# MyNurse for iPhone

The iOS app is the same React app wrapped in a native shell with **Capacitor 8**. The Xcode project is in `ios/App`
and uses Swift Package Manager (no CocoaPods). You don't need a Mac: **Codemagic** builds it, signs it, and uploads it to TestFlight.

| | |
|---|---|
| App name | MyNurse |
| Bundle ID | `com.simpleai.mynurse` |
| Version / build | 1.0 / set automatically by Codemagic |
| Devices | iPhone, portrait, iOS 15+ |
| Email link scheme | `mynurse://` |

## What's different inside the app

- **AI features** call your live Netlify site (`NEXT_PUBLIC_SITE_URL`) instead of a relative path. The Claude function now allows requests from the app (`capacitor://localhost`).
- **Email confirmation and password reset links** open the app (`mynurse://auth-callback`) and sign the person in. On the website they still return to the website.
- **Account deletion** is under Account → Delete account (Apple requires this for any app with sign-up).
- **Privacy policy** at `/privacy`, linked from the footer and Account.
- Signed-out users see a short welcome screen instead of the marketing page. The bottom tab bar is always shown, and inner pages have back links.

## 1. Supabase (once)

1. Run `supabase/schema.sql` again in the SQL editor. It adds `delete_my_account()` and is safe to re-run.
2. **Authentication → URL Configuration → Redirect URLs**: add `mynurse://**`. Keep your Netlify URL and localhost entries.

## 2. Netlify (once)

Push this version so the Claude function includes the app's CORS handling. Add these to the site's environment variables:

- `NEXT_PUBLIC_SITE_URL` = your live address, e.g. `https://mynurse.netlify.app` (no trailing slash)
- `NEXT_PUBLIC_SUPPORT_EMAIL` = a support address shown on the privacy page

## 3. Apple (once)

1. developer.apple.com → Certificates, IDs & Profiles → Identifiers → **+** → App IDs → App. Use bundle ID `com.simpleai.mynurse`. No extra capabilities are needed.
2. App Store Connect → Apps → **+** → New App. Platform iOS, bundle ID `com.simpleai.mynurse`, SKU `mynurse`. If "MyNurse" is taken, use something like "MyNurse: NCLEX Prep". The name on the home screen stays MyNurse.
3. App Store Connect → Users and Access → Integrations → **App Store Connect API** → generate a key with **App Manager** access. Download the `.p8` file (you can only download it once) and note the Key ID and Issuer ID.

## 4. Codemagic setup (once)

1. **Add application** → pick this repo. Codemagic finds `codemagic.yaml`.
2. Team settings → Team integrations → **Developer Portal** → Manage keys → add the API key. Name it exactly **`MyNurse ASC key`** (the name in `codemagic.yaml`). Enter the Issuer ID and Key ID, and upload the `.p8`.
3. Team settings → **Code signing identities**:
   - iOS certificates → **Generate certificate** → Apple Distribution, using the key above. Save the password it shows.
   - iOS provisioning profiles → **Fetch profiles** → pick the App Store profile for `com.simpleai.mynurse`. Create it if none exists.
4. App → Environment variables → create a group named **`mynurse`** with:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL`
   - `NEXT_PUBLIC_SUPPORT_EMAIL`

   `ANTHROPIC_API_KEY` is **not** needed here. It stays on Netlify.

## 5. Build

In Codemagic, click **Start new build** and choose workflow **MyNurse iOS → TestFlight**. Pushing a tag such as `ios-v1.0.0` also starts it.

The build checks your settings, builds the web app, syncs it into Xcode, signs it, and uploads the `.ipa` to TestFlight. Processing takes about 10–30 minutes. Then install it from the **TestFlight** app on your iPhone.

For a new App Store version, change `MARKETING_VERSION = 1.0;` in `ios/App/App.xcodeproj/project.pbxproj`, e.g. to 1.1. Build numbers go up automatically.

## 6. Submitting for review

In App Store Connect for the version:

- **Privacy Policy URL:** `https://YOUR-SITE/privacy`. **Support URL:** your site or a contact page.
- **Category:** Education. **Age rating:** answer the questionnaire. It's normally 4+, or 12+ if you mark user-generated content, since tutor profiles and reviews are user content.
- **Screenshots:** iPhone 6.9" (1320 × 2868). Take them from a TestFlight install.
- **App Privacy:** Data collected, linked to the user, not used for tracking:
  - Contact Info: Name, Email
  - User Content: Other User Content (quizzes, flashcards, tutor profiles, reviews, AI questions)
  - Usage Data: Product Interaction (quiz scores and time)

  All of it is used for App Functionality.
- **App Review notes:** give a working demo login with some quizzes taken, and a second demo account set up as a tutor if possible. Explain that tutoring is arranged and paid directly between tutors and students outside the app (real-world, person-to-person services).

Apple sometimes rejects apps that feel like a wrapped website (guideline 4.2). MyNurse has accounts, saved progress, and native email-link handling, which helps. If review pushes back, native touches like push reminders for study streaks are the usual next step.

## Building on a Mac instead (optional)

```
npm install
npm run ios:sync      # build the web app and copy it into ios/
npm run ios:open      # opens Xcode → pick your team under Signing & Capabilities → Run
```

Run `npm run ios:sync` after every web change. Make sure `.env` has `NEXT_PUBLIC_SITE_URL` set, or AI features won't work in the app.
