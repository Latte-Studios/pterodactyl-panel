<?php

namespace Pterodactyl\Exceptions\Sso;

use Pterodactyl\Exceptions\DisplayException;

/**
 * Raised when a Google sign-in or link attempt cannot be completed. The reason
 * is a short stable code that the login page maps to a message; the message on
 * the exception itself is the translated text for that reason.
 */
class GoogleSsoException extends DisplayException
{
    public const REASON_DISABLED = 'disabled';
    public const REASON_STATE = 'state';
    public const REASON_UNVERIFIED = 'unverified';
    public const REASON_DOMAIN = 'domain';
    public const REASON_NO_ACCOUNT = 'no-account';
    public const REASON_ALREADY_LINKED = 'already-linked';

    public function __construct(private string $reason, ?\Throwable $previous = null)
    {
        parent::__construct(trans('auth.sso.google.' . $reason), $previous, self::LEVEL_WARNING);
    }

    public function getReason(): string
    {
        return $this->reason;
    }
}
