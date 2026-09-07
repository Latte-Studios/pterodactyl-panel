<?php

namespace Pterodactyl\Services\NodeWatcher;

/**
 * The outcome of a single attempt to deliver a webhook.
 */
final class DeliveryResult
{
    /**
     * @param int $status the HTTP status of the response, or 0 when no response was received
     * @param string|null $error a short description of what went wrong, if anything
     * @param float $durationMs how long the attempt took
     */
    public function __construct(
        public readonly int $status,
        public readonly ?string $error = null,
        public readonly float $durationMs = 0,
    ) {
    }

    public function isSuccessful(): bool
    {
        return $this->status >= 200 && $this->status < 300;
    }

    /**
     * A delivery is worth retrying when the receiver could not be reached at all
     * or answered with a server error. A client error means the request itself is
     * wrong and repeating it will not help.
     */
    public function isRetryable(): bool
    {
        return $this->status === 0 || $this->status >= 500;
    }
}
