<?php

namespace Pterodactyl\Http\Controllers\Auth;

use Illuminate\Http\Request;
use Pterodactyl\Models\User;
use Pterodactyl\Facades\Activity;
use Illuminate\Http\RedirectResponse;
use Laravel\Socialite\Facades\Socialite;
use GuzzleHttp\Exception\ClientException;
use Laravel\Socialite\Two\GoogleProvider;
use Pterodactyl\Services\Sso\GoogleSsoService;
use Laravel\Socialite\Two\InvalidStateException;
use Pterodactyl\Exceptions\Sso\GoogleSsoException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Sign in, link or re-authenticate an account through Google Workspace. One
 * callback URL serves all three: which one is meant is decided when the
 * redirect starts, from who is signed in and whether they are linked already,
 * and kept in the session until Google returns.
 */
class GoogleSsoController extends AbstractLoginController
{
    private const SESSION_INTENT = 'sso.google.intent';
    private const SESSION_INTENDED = 'sso.google.intended';

    /** A guest signs in. */
    private const INTENT_LOGIN = 'login';

    /** A signed-in user without a Google account links one. */
    private const INTENT_LINK = 'link';

    /**
     * A signed-in, linked user proves the current session through Google, so
     * the two-factor policy accepts it. See RequireTwoFactorAuthentication.
     */
    private const INTENT_REAUTH = 'reauth';

    public function __construct(private GoogleSsoService $sso)
    {
        parent::__construct();
    }

    /**
     * Send the browser to Google's account chooser.
     */
    public function redirect(Request $request): RedirectResponse
    {
        $this->assertEnabled();

        /** @var User|null $user */
        $user = $request->user();
        $intent = match (true) {
            is_null($user) => self::INTENT_LOGIN,
            !empty($user->google_subject) => self::INTENT_REAUTH,
            default => self::INTENT_LINK,
        };

        // Linking hands a new way into the account to whoever holds this
        // session, so the password has to have been confirmed moments ago.
        if ($intent === self::INTENT_LINK && !$this->sso->consumeLinkConfirmation($request)) {
            return redirect()->to('/account?sso_error=' . GoogleSsoException::REASON_CONFIRM);
        }

        $request->session()->put(self::SESSION_INTENT, $intent);
        $request->session()->forget(self::SESSION_INTENDED);
        if ($intended = $this->safeIntended($request->query('redirect'))) {
            $request->session()->put(self::SESSION_INTENDED, $intended);
        }

        if ($intent === self::INTENT_REAUTH) {
            // The account is known, so no chooser: with a live Google session
            // this is a silent round trip.
            $parameters = ['login_hint' => $user->google_email];
        } else {
            $parameters = ['prompt' => 'select_account'];
        }

        if ($domains = $this->sso->allowedDomains()) {
            // Narrows Google's account chooser to the first allowed domain. The
            // real check happens on the way back, in the service.
            $parameters['hd'] = count($domains) === 1 ? $domains[0] : '*';
        }

        /** @var GoogleProvider $google */
        $google = Socialite::driver('google');

        return $google
            ->scopes(['openid', 'email', 'profile'])
            ->with($parameters)
            ->redirect();
    }

    /**
     * Google sends the browser back here with a code (or an error).
     */
    public function callback(Request $request): RedirectResponse
    {
        $this->assertEnabled();

        $intent = $request->session()->pull(self::SESSION_INTENT, self::INTENT_LOGIN);
        $intended = $request->session()->pull(self::SESSION_INTENDED) ?: '/';
        $back = $intent === self::INTENT_LOGIN ? '/auth/login' : '/account';

        // The person closed the chooser or refused consent: nothing to report.
        if ($request->filled('error')) {
            return redirect()->to($back);
        }

        try {
            try {
                $google = Socialite::driver('google')->user();
            } catch (InvalidStateException|ClientException $exception) {
                throw new GoogleSsoException(GoogleSsoException::REASON_STATE, $exception);
            }

            if ($intent === self::INTENT_LINK) {
                $this->sso->link($this->signedInUser($request), $google);

                return redirect()->to('/account?sso_linked=1');
            }

            if ($intent === self::INTENT_REAUTH) {
                $user = $this->signedInUser($request);
                if ((string) $google->getId() !== (string) $user->google_subject) {
                    throw new GoogleSsoException(GoogleSsoException::REASON_MISMATCH);
                }

                $this->sso->markSessionAuthenticated($request);
                Activity::event('auth:sso-success')->withRequestMetadata()->subject($user)->log();

                return redirect()->to($intended);
            }

            $user = $this->sso->resolve($google);
            $this->authenticate($user, $request);
            $this->sso->markSessionAuthenticated($request);

            Activity::event('auth:sso-success')->withRequestMetadata()->subject($user)->log();

            return redirect()->to($intended);
        } catch (GoogleSsoException $exception) {
            Activity::event('auth:sso-fail')
                ->withRequestMetadata()
                ->property('reason', $exception->getReason())
                ->property('email', isset($google) ? $google->getEmail() : null)
                ->log();

            return redirect()->to($back . '?sso_error=' . $exception->getReason());
        }
    }

    /**
     * @throws GoogleSsoException when the session that started the round trip
     *                            is not signed in any more
     */
    private function signedInUser(Request $request): User
    {
        /** @var User|null $user */
        $user = $request->user();
        if (!$user) {
            throw new GoogleSsoException(GoogleSsoException::REASON_STATE);
        }

        return $user;
    }

    /**
     * @throws NotFoundHttpException
     */
    private function assertEnabled(): void
    {
        if (!$this->sso->isEnabled()) {
            throw new NotFoundHttpException(trans('auth.sso.google.disabled'));
        }
    }

    /**
     * Only same-site paths may be used as a post-login destination, so the
     * callback cannot be turned into an open redirect.
     */
    private function safeIntended(mixed $value): ?string
    {
        if (!is_string($value) || $value === '' || $value[0] !== '/' || str_starts_with($value, '//')) {
            return null;
        }

        return $value;
    }
}
