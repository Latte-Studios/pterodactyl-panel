<?php

namespace Pterodactyl\Services\NodeWatcher;

use Carbon\Carbon;
use Ramsey\Uuid\Uuid;
use Pterodactyl\Models\Node;
use Pterodactyl\Models\NodeWatcherWebhook;
use Pterodactyl\Jobs\NodeWatcher\SendNodeWatcherWebhook;

/**
 * Turns something that happened to a node into queued webhook deliveries.
 */
class NodeWatcherService
{
    public function __construct(private TemplateRenderer $renderer)
    {
    }

    /**
     * Queues one delivery for every enabled webhook subscribed to the event and
     * node. Returns how many deliveries were queued.
     */
    public function dispatch(string $event, ?Node $node, array $data): int
    {
        $webhooks = NodeWatcherWebhook::query()
            ->enabled()
            ->get()
            ->filter(fn (NodeWatcherWebhook $webhook) => $webhook->isSubscribedTo($event, $node));

        if ($webhooks->isEmpty()) {
            return 0;
        }

        $payload = $this->payload($event, $node, $data);

        // The body is rendered here rather than in the job so that a retry sends
        // exactly the same bytes, and therefore the same signature, as the first
        // attempt.
        foreach ($webhooks as $webhook) {
            SendNodeWatcherWebhook::dispatch($webhook, $event, $payload['delivery'], $this->body($webhook, $payload));
        }

        return $webhooks->count();
    }

    /**
     * Builds the default payload for an event. This is also the data the custom
     * body templates are rendered against.
     */
    public function payload(string $event, ?Node $node, array $data): array
    {
        return [
            'event' => $event,
            'delivery' => Uuid::uuid4()->toString(),
            'sent_at' => Carbon::now()->toIso8601ZuluString(),
            'panel' => [
                'url' => config('app.url'),
                'version' => config('app.version'),
            ],
            'node' => is_null($node) ? null : [
                'id' => $node->id,
                'uuid' => $node->uuid,
                'name' => $node->name,
                'fqdn' => $node->fqdn,
                'location' => $node->location?->short,
            ],
            'data' => $data,
        ];
    }

    /**
     * Returns the body to send to a webhook: the rendered template when there is
     * one, the default payload as JSON otherwise.
     */
    public function body(NodeWatcherWebhook $webhook, array $payload): string
    {
        if (is_null($webhook->body_template) || trim($webhook->body_template) === '') {
            return json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }

        return $this->renderer->render($webhook->body_template, $payload);
    }

    /**
     * A realistic payload for an event, used to validate and preview templates
     * without waiting for a real node to run out of memory. Every event in
     * SAMPLE_EVENTS has one; the shape of "data" is what the real event sends.
     *
     * @throws \InvalidArgumentException when the event has no sample
     */
    public function samplePayload(string $event = NodeWatcherWebhook::EVENT_PRESSURE): array
    {
        if (!in_array($event, NodeWatcherWebhook::SAMPLE_EVENTS, true)) {
            throw new \InvalidArgumentException(sprintf('There is no sample payload for the "%s" event.', $event));
        }

        $now = Carbon::now()->toIso8601ZuluString();
        $node = [
            'id' => 1,
            'uuid' => 'a1b2c3d4-0000-4000-8000-000000000001',
            'name' => 'example-node',
            'fqdn' => 'node.example.com',
            'location' => 'example',
        ];
        $reachability = [
            'failures' => 3,
            'since' => Carbon::now()->subMinutes(3)->toIso8601String(),
            'last_error' => 'cURL error 7: Failed to connect to node.example.com port 8080 after 5000 ms: Connection refused',
        ];

        $data = match ($event) {
            NodeWatcherWebhook::EVENT_PRESSURE => ['previous' => 'warning', 'current' => 'critical', 'snapshot' => $this->sampleSnapshot(true)],
            NodeWatcherWebhook::EVENT_HEARTBEAT => ['snapshot' => $this->sampleSnapshot(false)],
            NodeWatcherWebhook::EVENT_UNREACHABLE, NodeWatcherWebhook::EVENT_REACHABLE => $reachability,
            NodeWatcherWebhook::EVENT_PING => [],
        };

        return [
            'event' => $event,
            'delivery' => '6f4d2c1e-8b3a-4c2f-9d1e-2a7b5c9e0f13',
            'sent_at' => $now,
            'panel' => [
                'url' => config('app.url'),
                'version' => config('app.version'),
            ],
            'node' => $event === NodeWatcherWebhook::EVENT_PING ? null : $node,
            'data' => $data,
        ];
    }

    /**
     * The sample payload of every event, keyed by event.
     *
     * @return array<string, array>
     */
    public function samplePayloads(): array
    {
        $payloads = [];
        foreach (NodeWatcherWebhook::SAMPLE_EVENTS as $event) {
            $payloads[$event] = $this->samplePayload($event);
        }

        return $payloads;
    }

    private function sampleSnapshot(bool $critical): array
    {
        return [
            'timestamp' => Carbon::now()->toIso8601ZuluString(),
            'interval_seconds' => 2,
            'cpu' => $critical
                ? ['threads' => 16, 'percent' => 91.3, 'load' => ['1' => 15.2, '5' => 12.8, '15' => 9.4], 'load_percent' => 95.0]
                : ['threads' => 16, 'percent' => 23.4, 'load' => ['1' => 3.1, '5' => 2.8, '15' => 2.4], 'load_percent' => 19.4],
            'memory' => $critical
                ? ['total_bytes' => 68719476736, 'used_bytes' => 65498251264, 'available_bytes' => 3221225472, 'percent' => 95.3]
                : ['total_bytes' => 68719476736, 'used_bytes' => 30064771072, 'available_bytes' => 38654705664, 'percent' => 43.8],
            'swap' => ['total_bytes' => 8589934592, 'used_bytes' => 1073741824, 'percent' => 12.5],
            'disks' => [
                ['labels' => ['data', 'backups'], 'path' => '/var/lib/pterodactyl', 'total_bytes' => 1099511627776, 'used_bytes' => 879609302220, 'percent' => 80.0],
                ['labels' => ['docker', 'root'], 'path' => '/', 'total_bytes' => 214748364800, 'used_bytes' => 128849018880, 'percent' => 60.0],
            ],
            'servers' => ['total' => 24, 'running' => 19, 'unlimited' => 1, 'memory_bytes' => 60129542144, 'cpu_absolute' => $critical ? 1320.5 : 310.2, 'memory_allocated_bytes' => 64424509440, 'cpu_allocated_percent' => 2400],
            'pressure' => [
                'level' => $critical ? 'critical' : 'ok',
                'resources' => $critical
                    ? ['cpu' => 'critical', 'memory' => 'critical', 'disk' => 'ok']
                    : ['cpu' => 'ok', 'memory' => 'ok', 'disk' => 'ok'],
                'thresholds' => ['warning_percent' => 85, 'critical_percent' => 95],
            ],
        ];
    }
}
