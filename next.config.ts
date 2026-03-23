import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';

function toOrigin(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function createCspValue(): string {
  const isDev = process.env.NODE_ENV !== 'production';
  const allowRemoteFaceAssets = process.env.NEXT_PUBLIC_ALLOW_REMOTE_FACE_ASSETS === 'true';
  const extraConnectOrigins = new Set<string>();
  const modelOrigin = toOrigin(process.env.NEXT_PUBLIC_FACE_LANDMARKER_MODEL_URL);
  const wasmOrigin = toOrigin(process.env.NEXT_PUBLIC_FACE_LANDMARKER_WASM_ROOT);

  if (allowRemoteFaceAssets && modelOrigin) {
    extraConnectOrigins.add(modelOrigin);
  }
  if (allowRemoteFaceAssets && wasmOrigin) {
    extraConnectOrigins.add(wasmOrigin);
  }

  const connectSrc = ["'self'", ...extraConnectOrigins, 'blob:'].join(' ');
  const scriptSrc = ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])].join(' ');

  return [
    "default-src 'self'",
    `connect-src ${connectSrc}`,
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSrc}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests'
  ].join('; ');
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    const cspValue = createCspValue();

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: cspValue },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(), payment=()'
          }
        ]
      }
    ];
  },
  turbopack: {
    root: fileURLToPath(new URL('.', import.meta.url))
  }
};

export default nextConfig;
