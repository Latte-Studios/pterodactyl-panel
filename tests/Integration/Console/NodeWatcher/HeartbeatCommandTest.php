<?php

namespace Pterodactyl\Tests\Integration\Console\NodeWatcher;

use Mockery\MockInterface;
use GuzzleHttp\Psr7\Request;
use Pterodactyl\Models\Node;
use GuzzleHttp\Psr7\Response;
use Pterodactyl\Models\Location;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\RequestException;
use Pterodactyl\Models\NodeWatcherWebhook;
use Pterodactyl\Tests\Integration\IntegrationTestCase;
use Pterodactyl\Jobs\NodeWatcher\SendNodeWatcherWebhook;
use Pterodactyl\Console\Commands\NodeWatcher\HeartbeatCommand;
use Pterodactyl\Repositories\Wings\DaemonConfigurationRepository;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

/**
 * The integration suite shares one database, so nodes created by other tests are
 * also visited by the command. Every assertion here is therefore scoped to the
 * nodes this test created.
 */
class HeartbeatCommandTest extends IntegrationTestCase
{
    private Node $node;

    private MockInterface $repository;

    public function setUp(): void
    {
        parent::setUp();

        Bus::fake();
        Cache::flush();
        NodeWatcherWebhook::query()->delete();
        config()->set('pterodactyl.node_watcher.heartbeat_interval', 5);

        $this->node = Node::factory()->for(Location::factory())->create();
        $this->repository = $this->mock(DaemonConfigurationRepository::class);
        $this->repository->shouldReceive('setNode')->andReturnSelf()->byDefault();
    }

    public function testHeartbeatIsDispatchedForEveryNode(): void
    {
        $other = Node::factory()->for($this->node->location)->create();
        NodeWatcherWebhook::factory()->create(['events' => [NodeWatcherWebhook::EVENT_HEARTBEAT]]);
        $this->repository->shouldReceive('getSystemUtilization')->andReturn(['cpu' => ['percent' => 12.5]]);

        $this->artisan(HeartbeatCommand::class)->assertSuccessful();

        $this->assertSame([$this->node->id, $other->id], $this->dispatchedFor(NodeWatcherWebhook::EVENT_HEARTBEAT, [$this->node, $other]));
        Bus::assertDispatched(SendNodeWatcherWebhook::class, function (SendNodeWatcherWebhook $job) {
            $body = json_decode($job->body, true);

            return $body['node']['id'] === $this->node->id && $body['data']['snapshot']['cpu']['percent'] === 12.5;
        });
    }

    public function testNothingHappensWhenTheHeartbeatIsDisabled(): void
    {
        config()->set('pterodactyl.node_watcher.heartbeat_interval', 0);
        NodeWatcherWebhook::factory()->create(['events' => [NodeWatcherWebhook::EVENT_HEARTBEAT]]);
        $this->repository->shouldNotReceive('getSystemUtilization');

        $this->artisan(HeartbeatCommand::class)->assertSuccessful();

        Bus::assertNothingDispatched();
    }

    public function testNothingHappensWithoutSubscribers(): void
    {
        NodeWatcherWebhook::factory()->create(['events' => [NodeWatcherWebhook::EVENT_PRESSURE]]);
        NodeWatcherWebhook::factory()->create(['events' => [NodeWatcherWebhook::EVENT_HEARTBEAT], 'enabled' => false]);
        $this->repository->shouldNotReceive('getSystemUtilization');

        $this->artisan(HeartbeatCommand::class)->assertSuccessful();

        Bus::assertNothingDispatched();
    }

    public function testTheIntervalIsRespectedBetweenRuns(): void
    {
        NodeWatcherWebhook::factory()->create(['events' => [NodeWatcherWebhook::EVENT_HEARTBEAT]]);
        $this->repository->shouldReceive('getSystemUtilization')->andReturn(['cpu' => []]);

        $this->artisan(HeartbeatCommand::class)->assertSuccessful();
        $this->artisan(HeartbeatCommand::class)->assertSuccessful();
        $this->artisan(HeartbeatCommand::class, ['--force' => true])->assertSuccessful();

        $this->travel(6)->minutes();
        $this->artisan(HeartbeatCommand::class)->assertSuccessful();

        $this->assertCount(3, $this->dispatchedFor(NodeWatcherWebhook::EVENT_HEARTBEAT, [$this->node]));
    }

    public function testEmptySnapshotIsNotDelivered(): void
    {
        NodeWatcherWebhook::factory()->create(['events' => [NodeWatcherWebhook::EVENT_HEARTBEAT]]);
        $this->repository->shouldReceive('getSystemUtilization')->andReturn([]);

        $this->artisan(HeartbeatCommand::class)->assertSuccessful();

        Bus::assertNothingDispatched();
    }

    public function testNodeIsReportedUnreachableAfterThreeFailuresAndReachableOnceItAnswersAgain(): void
    {
        NodeWatcherWebhook::factory()->create(['events' => [NodeWatcherWebhook::EVENT_UNREACHABLE]]);
        $this->repository->shouldReceive('getSystemUtilization')->times(4 * Node::query()->count())->andThrow($this->connectionFailure());

        for ($i = 0; $i < 4; ++$i) {
            $this->artisan(HeartbeatCommand::class, ['--force' => true])->assertSuccessful();
        }

        $this->assertCount(1, $this->dispatchedFor(NodeWatcherWebhook::EVENT_UNREACHABLE, [$this->node]));
        Bus::assertDispatched(SendNodeWatcherWebhook::class, function (SendNodeWatcherWebhook $job) {
            $body = json_decode($job->body, true);

            return $job->event === NodeWatcherWebhook::EVENT_UNREACHABLE
                && $body['node']['id'] === $this->node->id
                && $body['data']['failures'] === 3
                && $body['data']['last_error'] !== ''
                && !empty($body['data']['since']);
        });

        $this->repository->shouldReceive('getSystemUtilization')->andReturn(['cpu' => []]);
        $this->artisan(HeartbeatCommand::class, ['--force' => true])->assertSuccessful();

        $this->assertCount(1, $this->dispatchedFor(NodeWatcherWebhook::EVENT_REACHABLE, [$this->node]));
        Bus::assertDispatched(SendNodeWatcherWebhook::class, function (SendNodeWatcherWebhook $job) {
            $body = json_decode($job->body, true);

            return $job->event === NodeWatcherWebhook::EVENT_REACHABLE
                && $body['node']['id'] === $this->node->id
                && $body['data']['failures'] === 4;
        });
    }

    public function testShortOutagesAreNotReported(): void
    {
        NodeWatcherWebhook::factory()->create(['events' => [NodeWatcherWebhook::EVENT_UNREACHABLE]]);
        $this->repository->shouldReceive('getSystemUtilization')->times(2 * Node::query()->count())->andThrow($this->connectionFailure());
        $this->repository->shouldReceive('getSystemUtilization')->andReturn(['cpu' => []]);

        for ($i = 0; $i < 3; ++$i) {
            $this->artisan(HeartbeatCommand::class, ['--force' => true])->assertSuccessful();
        }

        Bus::assertNothingDispatched();
    }

    public function testDaemonsWithoutTheMonitorAreNotUnreachable(): void
    {
        NodeWatcherWebhook::factory()->create(['events' => [NodeWatcherWebhook::EVENT_UNREACHABLE]]);
        $request = new Request('GET', '/api/system/utilization');
        $this->repository->shouldReceive('getSystemUtilization')->andThrow(
            new DaemonConnectionException(new RequestException('disabled', $request, new Response(503))),
        );

        for ($i = 0; $i < 3; ++$i) {
            $this->artisan(HeartbeatCommand::class, ['--force' => true])->assertSuccessful();
        }

        Bus::assertNothingDispatched();
    }

    private function connectionFailure(): DaemonConnectionException
    {
        return new DaemonConnectionException(new ConnectException('cURL error 28: Connection timed out', new Request('GET', '/api/system/utilization')));
    }

    /**
     * Returns the ids of the given nodes, once per dispatched job of the event, in
     * dispatch order.
     *
     * @param Node[] $nodes
     *
     * @return int[]
     */
    private function dispatchedFor(string $event, array $nodes): array
    {
        $ids = array_map(fn (Node $node) => $node->id, $nodes);

        return Bus::dispatched(SendNodeWatcherWebhook::class, function (SendNodeWatcherWebhook $job) use ($event, $ids) {
            return $job->event === $event && in_array(json_decode($job->body, true)['node']['id'], $ids, true);
        })->map(fn (SendNodeWatcherWebhook $job) => json_decode($job->body, true)['node']['id'])->values()->all();
    }
}
