import http from '@/api/http';

/**
 * Removes the Google Workspace account linked to the signed-in user. Linking
 * goes through the browser redirect at /auth/sso/google, not the API.
 */
export default (): Promise<void> => http.delete('/api/client/account/sso/google').then(() => undefined);
