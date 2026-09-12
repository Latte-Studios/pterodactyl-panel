<?php

namespace Pterodactyl\Tests\Integration\Services\NodeWatcher;

use Pterodactyl\Models\Node;
use Illuminate\Support\Facades\Bus;
use Pterodactyl\Models\NodeWatcherWebhook;
use Pterodactyl\Tests\Integration\IntegrationTestCase;
use Pterodactyl\Jobs\NodeWatcher\SendNodeWatcherWebhook;
use Pterodactyl\Services\NodeWatcher\NodeWatcherService;

class NodeWatcherServiceTest extends IntegrationTestCase
{
    private NodeWatcherService $service;

    private Node $node;

    public function setUp(): void
    {
        parent::setUp();

        Bus::fake();
        // The integration suite shares one database, so only this table is reset.
        NodeWatcherWebhook::query()->delete();

        $this->service = $this->app->make(NodeWatcherService::class);
        $this->node = $this->createServerModel()->node;
    }

    public function testOnlyEnabledWebhooksSubscribedToTheEventAndNodeReceiveIt()
    {
        $other = Node::factory()->for($this->node->location)->create();

        $expected = NodeWatcherWebhook::factory()->create();
        NodeWatcherWebhook::factory()->create(['enabled' => false]);
        NodeWatcherWebhook::factory()->create(['events' => [NodeWatcherWebhook::EVENT_HEARTBEAT]]);
        NodeWatcherWebhook::factory()->create(['node_ids' => [$other->id]]);
        $scoped = NodeWatcherWebhook::factory()->create(['node_ids' => [$this->node->id]]);

        $count = $this->service->dispatch(NodeWatcherWebhook::EVENT_PRESSURE, $this->node, ['previous' => 'ok', 'current' => 'warning']);

        $this->assertSame(2, $count);
        Bus::assertDispatchedTimes(SendNodeWatcherWebhook::class, 2);
        Bus::assertDispatched(SendNodeWatcherWebhook::class, fn (SendNodeWatcherWebhook $job) => $job->webhook->is($expected));
        Bus::assertDispatched(SendNodeWatcherWebhook::class, fn (SendNodeWatcherWebhook $job) => $job->webhook->is($scoped));
    }

    public function testNothingIsDispatchedWithoutSubscribers()
    {
        $this->assertSame(0, $this->service->dispatch(NodeWatcherWebhook::EVENT_PRESSURE, $this->node, []));

        Bus::assertNothingDispatched();
    }

    public function testRecoveryEventsGoToTheFailureSubscription()
    {
        NodeWatcherWebhook::factory()->create(['events' => [NodeWatcherWebhook::EVENT_UNREACHABLE]]);

        $this->assertSame(1, $this->service->dispatch(NodeWatcherWebhook::EVENT_REACHABLE, $this->node, ['failures' => 3]));
    }

    public function testDefaultBodyCarriesTheNodeAndTheData()
    {
        $webhook = NodeWatcherWebhook::factory()->create();

        $this->service->dispatch(NodeWatcherWebhook::EVENT_PRESSURE, $this->node, ['previous' => 'ok', 'current' => 'critical']);

        Bus::assertDispatched(SendNodeWatcherWebhook::class, function (SendNodeWatcherWebhook $job) use ($webhook) {
            $body = json_decode($job->body, true);

            return $job->webhook->is($webhook)
                && $job->event === NodeWatcherWebhook::EVENT_PRESSURE
                && $job->delivery === $body['delivery']
                && $body['event'] === NodeWatcherWebhook::EVENT_PRESSURE
                && $body['node']['id'] === $this->node->id
                && $body['node']['name'] === $this->node->name
                && $body['node']['location'] === $this->node->location->short
                && $body['data'] === ['previous' => 'ok', 'current' => 'critical']
                && $body['panel']['version'] === config('app.version');
        });
    }

    public function testCustomTemplateIsRenderedIntoTheBody()
    {
        NodeWatcherWebhook::factory()->create([
            'body_template' => '{"content":"{{node.name}} went {{data.current}}"}',
        ]);

        $this->service->dispatch(NodeWatcherWebhook::EVENT_PRESSURE, $this->node, ['previous' => 'ok', 'current' => 'critical']);

        Bus::assertDispatched(SendNodeWatcherWebhook::class, fn (SendNodeWatcherWebhook $job) => $job->body === sprintf('{"content":"%s went critical"}', $this->node->name));
    }

    public function testSamplePayloadRendersTheDefaultTemplates()
    {
        $payload = $this->service->samplePayload();

        $this->assertSame(NodeWatcherWebhook::EVENT_PRESSURE, $payload['event']);
        $this->assertSame('critical', $payload['data']['snapshot']['pressure']['level']);
        $this->assertNotNull(json_encode($payload));
    }

    public function testEveryEventHasASampleShapedLikeTheRealPayload()
    {
        $samples = $this->service->samplePayloads();

        $this->assertSame(NodeWatcherWebhook::SAMPLE_EVENTS, array_keys($samples));
        foreach ($samples as $event => $sample) {
            $this->assertSame($event, $sample['event']);
        }

        $this->assertSame('ok', $samples[NodeWatcherWebhook::EVENT_HEARTBEAT]['data']['snapshot']['pressure']['level']);
        $this->assertArrayNotHasKey('current', $samples[NodeWatcherWebhook::EVENT_HEARTBEAT]['data']);
        $this->assertSame(['failures', 'since', 'last_error'], array_keys($samples[NodeWatcherWebhook::EVENT_UNREACHABLE]['data']));
        $this->assertSame($samples[NodeWatcherWebhook::EVENT_UNREACHABLE]['data'], $samples[NodeWatcherWebhook::EVENT_REACHABLE]['data']);
        $this->assertNull($samples[NodeWatcherWebhook::EVENT_PING]['node']);
        $this->assertSame([], $samples[NodeWatcherWebhook::EVENT_PING]['data']);

        $this->expectException(\InvalidArgumentException::class);
        $this->service->samplePayload('nope');
    }
}
