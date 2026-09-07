<?php

namespace Pterodactyl\Console\Commands\NodeWatcher;

use Carbon\CarbonImmutable;
use Pterodactyl\Models\Node;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Models\NodeWatcherWebhook;
use Pterodactyl\Services\NodeWatcher\NodeWatcherService;
use Pterodactyl\Repositories\Wings\DaemonConfigurationRepository;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

/**
 * Collects the utilization of every node for the "host.heartbeat" event and
 * keeps track of nodes that stop answering for the "node.unreachable" event.
 * The scheduler runs it every minute; the configured interval decides whether
 * a run does anything.
 */
class HeartbeatCommand extends Command
{
    /**
     * Consecutive failed collections before a node is reported as unreachable.
     */
    public const FAILURES_TO_REPORT = 3;

    private const LAST_RUN_KEY = 'node-watcher:heartbeat:last-run';

    protected $signature = 'p:node-watcher:heartbeat {--force : Run even if the interval has not elapsed yet}';

    protected $description = 'Collects the utilization of every node and delivers it to the Node Watcher webhooks.';

    public function __construct(
        private NodeWatcherService $service,
        private DaemonConfigurationRepository $repository,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $interval = (int) config('pterodactyl.node_watcher.heartbeat_interval');
        if ($interval <= 0 && !$this->option('force')) {
            $this->info('The heartbeat is disabled.');

            return self::SUCCESS;
        }

        $lastRun = Cache::get(self::LAST_RUN_KEY);
        if (!$this->option('force') && $lastRun && CarbonImmutable::now()->lessThan(CarbonImmutable::parse($lastRun)->addMinutes($interval))) {
            return self::SUCCESS;
        }

        $webhooks = NodeWatcherWebhook::query()->enabled()->get();
        $wantsHeartbeat = $webhooks->contains(fn (NodeWatcherWebhook $webhook) => $webhook->isSubscribedTo(NodeWatcherWebhook::EVENT_HEARTBEAT));
        $wantsReachability = $webhooks->contains(fn (NodeWatcherWebhook $webhook) => $webhook->isSubscribedTo(NodeWatcherWebhook::EVENT_UNREACHABLE));
        if (!$wantsHeartbeat && !$wantsReachability) {
            $this->info('No webhook is subscribed to the heartbeat.');

            return self::SUCCESS;
        }

        Cache::put(self::LAST_RUN_KEY, CarbonImmutable::now()->toIso8601String(), CarbonImmutable::now()->addDay());

        foreach (Node::query()->get() as $node) {
            try {
                $snapshot = $this->repository->setNode($node)->getSystemUtilization();
            } catch (DaemonConnectionException $exception) {
                // A daemon that answers, even to say that it does not know the route
                // (older Wings) or that the monitor is off, is reachable.
                if (in_array($exception->getStatusCode(), [404, 501, 503], true)) {
                    $this->recovered($node);
                } else {
                    $this->failed($node, $exception->getMessage());
                }

                continue;
            }

            $this->recovered($node);

            // The daemon answers with an empty body until it has collected its
            // first sample, which is not worth a heartbeat.
            if ($wantsHeartbeat && !empty($snapshot)) {
                $this->service->dispatch(NodeWatcherWebhook::EVENT_HEARTBEAT, $node, ['snapshot' => $snapshot]);
            }
        }

        return self::SUCCESS;
    }

    private function failed(Node $node, string $error): void
    {
        $state = Cache::get($this->stateKey($node), ['failures' => 0, 'since' => CarbonImmutable::now()->toIso8601String()]);
        ++$state['failures'];
        $state['last_error'] = $error;

        Cache::put($this->stateKey($node), $state, CarbonImmutable::now()->addDay());

        $this->warn(sprintf('Node %s could not be reached (%d in a row): %s', $node->name, $state['failures'], $error));

        if ($state['failures'] === self::FAILURES_TO_REPORT) {
            $this->service->dispatch(NodeWatcherWebhook::EVENT_UNREACHABLE, $node, $state);
        }
    }

    private function recovered(Node $node): void
    {
        $state = Cache::pull($this->stateKey($node));
        if (is_null($state)) {
            return;
        }

        if ($state['failures'] >= self::FAILURES_TO_REPORT) {
            $this->info(sprintf('Node %s is reachable again after %d failed attempts.', $node->name, $state['failures']));
            $this->service->dispatch(NodeWatcherWebhook::EVENT_REACHABLE, $node, $state);
        }
    }

    private function stateKey(Node $node): string
    {
        return "node-watcher:unreachable:{$node->id}";
    }
}
