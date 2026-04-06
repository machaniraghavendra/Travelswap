# TravelSwap Mobile + Web (Single Codebase)

This project now supports:
- Web (Vite): existing deployment flow
- Android (Capacitor wrapper)
- iOS (Capacitor wrapper)

## 1) Install dependencies

```bash
npm install
```

## 2) Build web + sync native projects

```bash
npm run mobile:sync
```

This will:
- build web assets into `dist/`
- sync Capacitor config/plugins
- create/update `android/` and `ios/` projects after platform add

## 3) Add native platforms (first time only)

```bash
npx cap add android
npx cap add ios
```

## 4) Run on Android

```bash
npm run mobile:android
```

Or open Android Studio project:

```bash
npm run mobile:open:android
```

## 5) Run on iOS (macOS only)

```bash
npm run mobile:ios
```

Or open Xcode project:

```bash
npm run mobile:open:ios
```

## 6) Keep web running as usual

```bash
npm run dev
```

## Notes

- Base API is already configured to production backend in `src/api.js`.
- Any frontend change is shared across web, Android, and iOS.
- After frontend changes, run `npm run mobile:sync` before rebuilding native apps.
