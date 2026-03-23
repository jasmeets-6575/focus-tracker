# Focus Timer

Focus Timer is an open-source, privacy-first study timer that can auto-run only when the user is present and alert.

## Why This Project
- Helps students track real focus time, not just screen time.
- Reduces manual timer switching with camera-assisted automation.
- Keeps processing local in-browser for better privacy.

## Features
- Manual stopwatch controls: `Start`, `Pause`, `Reset`
- Configurable start value in `HH:MM:SS`
- Auto mode using webcam presence detection
- Sleep detection using eye-closure blendshapes
- Sleep buzzer after sustained drowsiness
- Parental lock for `Pause` and `Disable Camera`
- Mobile-friendly responsive layout

## Privacy
- Camera processing runs locally in the browser.
- No video frames are uploaded by this app.
- No identity recognition is implemented.
- Eye-closure detection is a heuristic and not medical advice.
- Local model/WASM assets are bundled and used by default (no CDN required).

## Tech Stack
- Next.js (App Router)
- React + TypeScript
- MediaPipe Tasks Vision (`@mediapipe/tasks-vision`)
- Vitest

## Project Structure
- `app/page.tsx` - main app orchestration
- `components/Stopwatch.tsx` - stopwatch UI
- `components/CameraTracker.tsx` - camera UI + status
- `hooks/useStopwatch.ts` - stopwatch logic
- `hooks/usePresenceDetection.ts` - camera + presence + sleep loop
- `hooks/useParentalLock.ts` - parental lock state/flows
- `hooks/useSleepBuzzer.ts` - buzzer state/flows
- `lib/faceDetector.ts` - MediaPipe landmarker initialization
- `lib/sleepDetection.ts` - sleep heuristics
- `__tests__/` - unit tests

## Getting Started

### Prerequisites
- Node.js 20+ (recommended)
- npm 10+
- Secure context for camera (`https://` or `http://localhost`)

### Install
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### Build Production
```bash
npm run build
npm run start
```

### Run Tests
```bash
npm test
```

## Configuration

Environment variables are optional.  
The app runs without any `.env` file; these variables are mainly for security/deployment control.

Default behavior is local-only for face assets:
- model: `/models/face_landmarker.task`
- wasm: `/mediapipe/wasm/*`

Optional environment variables:
- `NEXT_PUBLIC_FACE_LANDMARKER_MODEL_URL` - custom model URL/path
- `NEXT_PUBLIC_FACE_LANDMARKER_WASM_ROOT` - custom wasm root URL/path
- `NEXT_PUBLIC_ALLOW_REMOTE_FACE_ASSETS` - set `true` only if you intentionally want remote asset loading
- `NEXT_PUBLIC_APP_URL` - app origin used in CSP setup

Example `.env.local`:
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ALLOW_REMOTE_FACE_ASSETS=false
```

## Scripts
```bash
npm run dev
npm run build
npm run start
npm run test
npm run test:watch
```

## Open Source Contribution

Contributions are welcome.

- Open an issue for bugs or feature requests.
- Fork the repo and create a feature branch.
- Add or update tests when behavior changes.
- Submit a PR with clear context and screenshots for UI changes.

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.
Please read [SECURITY.md](./SECURITY.md) for vulnerability reporting and deployment guidance.

## Roadmap Ideas
- Better onboarding and first-run camera diagnostics
- Export/import focus sessions
- Optional analytics mode with explicit consent
- More robust parental-control hardening

## Known Limitations
- Detection quality depends on lighting, angle, and occlusion.
- Background tab throttling can affect detection cadence.
- Browser autoplay policies can block audio until user interaction.

## License
This project is licensed under the MIT License. See [LICENSE](./LICENSE).
