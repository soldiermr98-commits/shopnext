// Server-only security configuration. Never supply defaults for signing or bootstrap credentials.
import 'dotenv/config';

export function securityConfig() {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 48 || new Set(secret).size < 16) {
    throw new Error('JWT_SECRET must be an externally generated random secret (at least 48 bytes).');
  }
  return { secret, accessSeconds: 900, refreshSeconds: 7 * 24 * 3600 };
}
