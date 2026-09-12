import http from '@/api/http';

/**
 * Confirms the account password so that the browser may start linking a Google
 * Workspace account. The confirmation lives in the session for a few minutes;
 * the redirect at /auth/sso/google refuses to start without it.
 */
export default (password: string): Promise<void> =>
    http.post('/api/client/account/sso/google', { password }).then(() => undefined);
