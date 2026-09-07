<?php

namespace Pterodactyl\Services\NodeWatcher;

use Illuminate\Support\Facades\Http;
use Pterodactyl\Models\NodeWatcherWebhook;
use Illuminate\Http\Client\ConnectionException;

/**
 * Performs the HTTP request for a single webhook delivery.
 */
class WebhookDeliverer
{
    public const HEADER_EVENT = 'X-Latte-Event';
    public const HEADER_DELIVERY = 'X-Latte-Delivery';
    public const HEADER_SIGNATURE = 'X-Latte-Signature';

    private const TIMEOUT_SECONDS = 10;
    private const CONNECT_TIMEOUT_SECONDS = 5;

    /**
     * Sends the already rendered body to the webhook. The body is signed as-is so
     * that the receiver can verify the raw request without re-encoding anything.
     */
    public function deliver(NodeWatcherWebhook $webhook, string $event, string $delivery, string $body): DeliveryResult
    {
        $started = microtime(true);

        try {
            $response = Http::withHeaders([
                self::HEADER_EVENT => $event,
                self::HEADER_DELIVERY => $delivery,
                self::HEADER_SIGNATURE => $this->sign($webhook->secret, $body),
            ])
                ->withUserAgent(sprintf('Latte-Pterodactyl-NodeWatcher/%s', config('app.version')))
                ->withBody($body, 'application/json')
                ->timeout(self::TIMEOUT_SECONDS)
                ->connectTimeout(self::CONNECT_TIMEOUT_SECONDS)
                // A redirect would hand the signed body to whatever host the
                // receiver points at, so it is treated as a failed delivery.
                ->withoutRedirecting()
                ->post($webhook->url);
        } catch (ConnectionException $exception) {
            return new DeliveryResult(0, $exception->getMessage(), $this->elapsed($started));
        }

        $status = $response->status();

        return new DeliveryResult(
            $status,
            $status >= 200 && $status < 300 ? null : sprintf('HTTP %d %s', $status, $response->reason()),
            $this->elapsed($started),
        );
    }

    /**
     * Computes the value of the signature header for a body.
     */
    public function sign(string $secret, string $body): string
    {
        return 'sha256=' . hash_hmac('sha256', $body, $secret);
    }

    private function elapsed(float $started): float
    {
        return round((microtime(true) - $started) * 1000, 1);
    }
}
