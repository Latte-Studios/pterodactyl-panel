<?php

namespace Pterodactyl\Tests\Integration\Api\Remote\Nodes;

use Pterodactyl\Models\Node;
use Illuminate\Support\Facades\Bus;
use Pterodactyl\Models\NodeWatcherWebhook;
use Pterodactyl\Tests\Integration\IntegrationTestCase;
use Pterodactyl\Jobs\NodeWatcher\SendNodeWatcherWebhook;

class NodePressureControllerTest extends IntegrationTestCase
{
    private Node $node;

    public function setUp(): void
    {
        parent::setUp();

        Bus::fake();
        NodeWatcherWebhook::query()->delete();

        $this->node = Node::factory()->create(['location_id' => $this->createServerModel()->node->location_id]);
    }

    public function testPressureChangeIsForwardedToTheWebhooksOfTheRequestingNode()
    {
        NodeWatcherWebhook::factory()->create();

        $this->asNode($this->node)
            ->postJson('/api/remote/nodes/pressure', $this->payload())
            ->assertNoContent();

        Bus::assertDispatched(SendNodeWatcherWebhook::class, function (SendNodeWatcherWebhook $job) {
            $body = json_decode($job->body, true);

            return $body['node']['uuid'] === $this->node->uuid
                && $body['data']['previous'] === 'ok'
                && $body['data']['current'] === 'critical'
                && $body['data']['snapshot']['pressure']['level'] === 'critical';
        });
    }

    public function testPayloadIsValidated()
    {
        NodeWatcherWebhook::factory()->create();

        $this->asNode($this->node)
            ->postJson('/api/remote/nodes/pressure', ['previous' => 'ok', 'current' => 'meltdown'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.0.meta.source_field', 'current');

        Bus::assertNothingDispatched();
    }

    public function testRequestWithoutNodeTokenIsRejected()
    {
        $this->postJson('/api/remote/nodes/pressure', $this->payload())->assertUnauthorized();
    }

    private function asNode(Node $node): self
    {
        return $this->withHeader('Authorization', "Bearer $node->daemon_token_id." . $node->getDecryptedKey());
    }

    private function payload(): array
    {
        return [
            'previous' => 'ok',
            'current' => 'critical',
            'snapshot' => [
                'timestamp' => '2026-09-07T14:00:00Z',
                'interval_seconds' => 2,
                'cpu' => ['threads' => 8, 'percent' => 97.0, 'load' => ['1' => 9.1, '5' => 8.0, '15' => 6.2], 'load_percent' => 113.7],
                'memory' => ['total_bytes' => 1, 'used_bytes' => 1, 'available_bytes' => 0, 'percent' => 99.0],
                'swap' => ['total_bytes' => 0, 'used_bytes' => 0, 'percent' => 0],
                'disks' => [],
                'servers' => ['total' => 1, 'running' => 1, 'unlimited' => 0, 'memory_bytes' => 1, 'cpu_absolute' => 100, 'memory_allocated_bytes' => 1, 'cpu_allocated_percent' => 100],
                'pressure' => ['level' => 'critical', 'resources' => ['cpu' => 'critical', 'memory' => 'critical', 'disk' => 'ok'], 'thresholds' => ['warning_percent' => 85, 'critical_percent' => 95]],
            ],
        ];
    }
}
