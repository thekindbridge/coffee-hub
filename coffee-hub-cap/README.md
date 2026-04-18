# Coffee Hub Capacitor Android Wrapper

This project wraps the deployed Coffee Hub Vercel web app in a dedicated Capacitor Android shell.

## Commands

```bash
npm install
npm run build
npm run cap:add:android
npm run assets:generate
npm run cap:sync
npm run cap:open:android
```

## Live App URL

`https://coffee-hub-inkollu.vercel.app/`

## Notes

- The Android shell loads the remote production app directly.
- Local web assets are used for native branding and offline fallback only.
- Capacitor 8 requires Node.js 22 or newer.
