<?php

namespace Pterodactyl\Services\Sso;

use Carbon\CarbonImmutable;
use Illuminate\Support\Str;
use Pterodactyl\Models\User;
use Pterodactyl\Rules\Username;
use Pterodactyl\Facades\Activity;
use Pterodactyl\Exceptions\Sso\GoogleSsoException;
use Pterodactyl\Services\Users\UserCreationService;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Illuminate\Contracts\Config\Repository as ConfigRepository;

class GoogleSsoService
{
    public function __construct(
        private ConfigRepository $config,
        private UserCreationService $creationService,
    ) {
    }

    public function isEnabled(): bool
    {
        return (bool) $this->config->get('services.google.enabled', false)
            && !empty($this->config->get('services.google.client_id'))
            && !empty($this->config->get('services.google.client_secret'));
    }

    /**
     * The domains a Google account may belong to, lowercased, in the order
     * they were configured. An empty list lets nobody in.
     *
     * @return string[]
     */
    public function allowedDomains(): array
    {
        $raw = (string) $this->config->get('services.google.allowed_domains', '');

        return array_values(array_filter(array_map(
            fn (string $domain) => mb_strtolower(trim($domain)),
            explode(',', $raw),
        )));
    }

    /**
     * Resolve the panel user for a Google account that is signing in. Prefers
     * the stable subject claim; falls back to the e-mail once, to link an
     * existing account, and finally creates one when the panel allows it.
     *
     * @throws GoogleSsoException
     * @throws \Throwable
     */
    public function resolve(SocialiteUser $google): User
    {
        $this->assertAcceptable($google);

        $user = User::query()->where('google_subject', $google->getId())->first();
        if ($user) {
            return $user;
        }

        $email = mb_strtolower($google->getEmail());
        $user = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();
        if ($user) {
            if (!empty($user->google_subject)) {
                throw new GoogleSsoException(GoogleSsoException::REASON_ALREADY_LINKED);
            }

            return $this->attach($user, $google);
        }

        if (!$this->config->get('services.google.auto_create', false)) {
            throw new GoogleSsoException(GoogleSsoException::REASON_NO_ACCOUNT);
        }

        [$first, $last] = $this->namesFor($google, $email);
        $user = $this->creationService->handle([
            'email' => $email,
            'username' => $this->usernameFor($email),
            'name_first' => $first,
            'name_last' => $last,
            'root_admin' => false,
        ]);

        return $this->attach($user, $google);
    }

    /**
     * Link a Google account to the user that is already signed in.
     *
     * @throws GoogleSsoException
     */
    public function link(User $user, SocialiteUser $google): User
    {
        $this->assertAcceptable($google);

        $owner = User::query()->where('google_subject', $google->getId())->first();
        if ($owner && $owner->id !== $user->id) {
            throw new GoogleSsoException(GoogleSsoException::REASON_ALREADY_LINKED);
        }

        return $this->attach($user, $google);
    }

    public function unlink(User $user): User
    {
        $user->forceFill([
            'google_subject' => null,
            'google_email' => null,
            'google_linked_at' => null,
        ])->saveOrFail();

        Activity::event('user:account.sso-unlinked')->subject($user)->log();

        return $user;
    }

    /**
     * @throws GoogleSsoException
     */
    protected function assertAcceptable(SocialiteUser $google): void
    {
        $raw = $google->getRaw();
        $email = mb_strtolower((string) $google->getEmail());

        if (empty($email) || ($raw['email_verified'] ?? false) !== true) {
            throw new GoogleSsoException(GoogleSsoException::REASON_UNVERIFIED);
        }

        $allowed = $this->allowedDomains();
        $domain = Str::afterLast($email, '@');
        $hosted = isset($raw['hd']) ? mb_strtolower((string) $raw['hd']) : null;

        if (!in_array($domain, $allowed, true) || ($hosted !== null && !in_array($hosted, $allowed, true))) {
            throw new GoogleSsoException(GoogleSsoException::REASON_DOMAIN);
        }
    }

    protected function attach(User $user, SocialiteUser $google): User
    {
        $user->forceFill([
            'google_subject' => (string) $google->getId(),
            'google_email' => mb_strtolower($google->getEmail()),
            'google_linked_at' => CarbonImmutable::now(),
        ])->saveOrFail();

        Activity::event('user:account.sso-linked')
            ->subject($user)
            ->property('email', $user->google_email)
            ->log();

        return $user;
    }

    /**
     * First and last name from the profile, falling back to the e-mail's local
     * part: both are required on the user model and Google does not promise
     * either one.
     *
     * @return array{0: string, 1: string}
     */
    protected function namesFor(SocialiteUser $google, string $email): array
    {
        $raw = $google->getRaw();
        $name = trim((string) $google->getName());
        $local = Str::before($email, '@');

        $first = trim((string) ($raw['given_name'] ?? Str::before($name, ' ')));
        $last = trim((string) ($raw['family_name'] ?? (Str::contains($name, ' ') ? Str::after($name, ' ') : '')));

        return [
            $first !== '' ? $first : $local,
            $last !== '' ? $last : $local,
        ];
    }

    /**
     * Derive a username from the e-mail's local part that passes the panel's
     * username rule and is not taken; a numeric suffix resolves collisions.
     */
    public function usernameFor(string $email): string
    {
        $local = mb_strtolower(Str::before($email, '@'));
        $base = trim(preg_replace('/[^a-z0-9_.-]+/', '-', $local), '-_.');

        if (!preg_match(Username::VALIDATION_REGEX, $base)) {
            $base = 'user-' . mb_strtolower(Str::random(8));
        }

        $candidate = $base;
        for ($i = 2; User::query()->where('username', $candidate)->exists(); ++$i) {
            $candidate = $base . '-' . $i;
        }

        return $candidate;
    }
}
