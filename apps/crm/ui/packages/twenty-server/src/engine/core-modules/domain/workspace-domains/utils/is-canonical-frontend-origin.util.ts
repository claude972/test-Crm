export const isCanonicalFrontendOrigin = (
  origin: string | undefined,
  frontendUrl: string,
): boolean => {
  if (!origin) return false;
  try {
    const candidate = new URL(origin);
    const frontend = new URL(frontendUrl);
    return (
      ['https:', 'http:'].includes(candidate.protocol) &&
      ['https:', 'http:'].includes(frontend.protocol) &&
      !candidate.username &&
      !candidate.password &&
      !candidate.search &&
      !candidate.hash &&
      candidate.pathname === '/' &&
      origin.toLowerCase() === candidate.origin.toLowerCase() &&
      candidate.origin === frontend.origin
    );
  } catch {
    return false;
  }
};
