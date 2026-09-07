<?php

namespace Pterodactyl\Jobs\NodeWatcher;

use Illuminate\Foundation\Queue\Queueable;
use Pterodactyl\Models\NodeWatcherWebhook;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\Attributes\WithoutRelations;
use Pterodactyl\Services\NodeWatcher\WebhookDeliverer;
use Illuminate\Queue\Attributes\DeleteWhenMissingModels;

/**
 * Delivers one already rendered body to one webhook, retrying with an
 * increasing delay when the receiver is down.
 */
#[DeleteWhenMissingModels]
class SendNodeWatcherWebhook implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    /**
     * Seconds to wait before each retry.
     *
     * @var int[]
     */
    public array $backoff = [30, 120, 600, 1800];

    public function __construct(
        #[WithoutRelations]
        public readonly NodeWatcherWebhook $webhook,
        public readonly string $event,
        public readonly string $delivery,
        public readonly string $body,
    ) {
    }

    /**
     * @throws \RuntimeException when the delivery failed in a way worth retrying
     */
    public function handle(WebhookDeliverer $deliverer): void
    {
        $result = $deliverer->deliver($this->webhook, $this->event, $this->delivery, $this->body);
        $this->webhook->recordDelivery($result);

        if ($result->isSuccessful()) {
            return;
        }

        // A client error means the receiver rejected this request and would
        // reject it again, so the failure is recorded and the job ends here.
        if (!$result->isRetryable()) {
            return;
        }

        throw new \RuntimeException(sprintf('Delivery %s to webhook %s failed: %s', $this->delivery, $this->webhook->uuid, $result->error ?? 'unknown error'));
    }
}
