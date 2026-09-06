<?php

namespace Pterodactyl\Http\Controllers\Admin\Nodes;

use Illuminate\Http\Request;
use Pterodactyl\Models\Node;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Repositories\Wings\DaemonConfigurationRepository;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

class NodeUtilizationController extends Controller
{
    /**
     * The number of seconds a utilization response is reused for. The admin view
     * polls faster than this so that a sample is never more than a few seconds
     * old, but several administrators watching the same node should not multiply
     * the number of requests made to the daemon.
     */
    private const CACHE_SECONDS = 2;

    /**
     * NodeUtilizationController constructor.
     */
    public function __construct(private DaemonConfigurationRepository $repository)
    {
    }

    /**
     * Returns the current resource utilization of the machine a node is running on.
     */
    public function __invoke(Request $request, Node $node): JsonResponse
    {
        try {
            $data = Cache::remember(
                "node:{$node->id}:utilization",
                self::CACHE_SECONDS,
                fn () => $this->repository->setNode($node)->getSystemUtilization(),
            );
        } catch (DaemonConnectionException $exception) {
            return match ($exception->getStatusCode()) {
                // A node that has not been updated yet does not know this route at all.
                Response::HTTP_NOT_FOUND => new JsonResponse(
                    ['error' => 'Wings 1.14.0 or newer is required'],
                    Response::HTTP_NOT_IMPLEMENTED,
                ),
                Response::HTTP_SERVICE_UNAVAILABLE => new JsonResponse(
                    ['error' => 'The host resource monitor is disabled on this node.'],
                    Response::HTTP_SERVICE_UNAVAILABLE,
                ),
                default => new JsonResponse(
                    ['error' => 'Could not reach the node to collect its resource utilization.'],
                    Response::HTTP_BAD_GATEWAY,
                ),
            };
        }

        // The daemon answers with an empty body until it has collected its first
        // sample, which happens within a few seconds of it booting.
        if (empty($data)) {
            return new JsonResponse(null, Response::HTTP_NO_CONTENT);
        }

        return new JsonResponse($data);
    }
}
