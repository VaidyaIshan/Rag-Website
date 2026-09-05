import { Logger } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const logger = new Logger('CORS');

function patternToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*')}$`);
}

/**
 * Builds a CORS origin check that supports exact origins and `*` wildcards
 * (e.g. "https://my-app-*.vercel.app" to cover Vercel preview deployments,
 * whose URL gets a new random hash on every deploy).
 *
 * Any rejected origin is logged so misconfigurations are easy to spot in
 * Render's logs instead of only showing up as a silent browser CORS error.
 */
export function createCorsOriginCheck(
  allowedPatterns: string[],
): CorsOptions['origin'] {
  const matchers = allowedPatterns.map((pattern) => ({
    pattern,
    regExp: patternToRegExp(pattern),
  }));

  return (origin, callback) => {
    // No Origin header (server-to-server calls, curl, health checks) — allow.
    if (!origin) return callback(null, true);

    const isAllowed = matchers.some(({ regExp }) => regExp.test(origin));
    if (isAllowed) return callback(null, true);

    logger.warn(
      `Rejected request from origin "${origin}" — not in FRONTEND_ORIGIN (${allowedPatterns.join(', ')}). ` +
        'Add it to FRONTEND_ORIGIN if this should be allowed.',
    );
    return callback(null, false);
  };
}
