<?php

namespace Pterodactyl\Http\Controllers\Auth;

use Illuminate\Http\Request;
use Pterodactyl\Facades\Activity;
use Illuminate\Http\RedirectResponse;
use Laravel\Socialite\Facades\Socialite;
use GuzzleHttp\Exception\ClientException;
use Pterodactyl\Services\Sso\GoogleSsoService;
use Laravel\Socialite\Two\InvalidStateException;
use Pterodactyl\Exceptions\Sso\GoogleSsoException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Sign in or link an account through Google Workspace. One callback URL serves
 * both: which one is meant is decided when the redirect starts, from whether
 * somebody is already signed in, and kept in the session until Google returns.
 */
class GoogleSsoController extends AbstractLoginController
{
    private const SESSION_INTENT = 'sso.google.intent';
    private const SESSION_INTENDED = 'sso.google.intended';

    private const INTENT_LOGIN = 'login';
    private const INTENT_LINK = 'link';

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

        $request->session()->put(self::SESSION_INTENT, $request->user() ? self::INTENT_LINK : self::INTENT_LOGIN);
        $request->session()->forget(self::SESSION_INTENDED);
        if ($intended = $this->safeIntended($request->query('redirect'))) {
            $request->session()->put(self::SESSION_INTENDED, $intended);
        }

        $parameters = ['prompt' => 'select_account'];
        if ($domains = $this->sso->allowedDomains()) {
            // Narrows Google's account chooser to the first allowed domain. The
            // real check happens on the way back, in the service.
            $parameters['hd'] = count($domains) === 1 ? $domains[0] : '*';
        }

        return Socialite::driver('google')
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
        $back = $intent === self::INTENT_LINK ? '/account' : '/auth/login';

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
                $user = $request->user();
                if (!$user) {
                    throw new GoogleSsoException(GoogleSsoException::REASON_STATE);
                }

                $this->sso->link($user, $google);

                return redirect()->to('/account?sso_linked=1');
            }

            $user = $this->sso->resolve($google);
            $this->authenticate($user, $request);

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
