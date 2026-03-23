# Security Policy

## Supported Versions
This project currently supports the latest commit on the default branch.

## Reporting a Vulnerability
Please do not disclose security issues in public issues.

Use one of the following:
1. GitHub Security Advisory (preferred, private)
2. Contact the repository maintainer directly

Include:
- Impact summary
- Steps to reproduce
- Affected files/versions
- Suggested mitigation (if known)

## Security-by-Default Notes
- Camera and face-processing run in-browser.
- Bundled local assets are used for model/WASM by default:
  - `/models/face_landmarker.task`
  - `/mediapipe/wasm/*`
- Remote model/WASM loading is disabled by default and requires:
  - `NEXT_PUBLIC_ALLOW_REMOTE_FACE_ASSETS=true`

## Deployment Recommendations
- Serve only over HTTPS.
- Keep browser and dependencies updated.
- Avoid untrusted extensions on camera-enabled clients.
- Use a strict CSP and do not loosen it without review.
