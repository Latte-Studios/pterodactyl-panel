<?php

namespace Pterodactyl\Http\Controllers\Api\Remote\Nodes;

use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Models\NodeWatcherWebhook;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Services\NodeWatcher\NodeWatcherService;
use Pterodactyl\Http\Requests\Api\Remote\NodePressureRequest;

class NodePressureController extends Controller
{
    public function __construct(private NodeWatcherService $service)
    {
    }

    /**
     * Receives a change of the host pressure level from a daemon and forwards it
     * to the webhooks watching that node.
     */
    public function __invoke(NodePressureRequest $request): JsonResponse
    {
        /** @var \Pterodactyl\Models\Node $node */
        $node = $request->attributes->get('node');

        $this->service->dispatch(NodeWatcherWebhook::EVENT_PRESSURE, $node, [
            'previous' => $request->input('previous'),
            'current' => $request->input('current'),
            'snapshot' => $request->input('snapshot'),
        ]);

        return new JsonResponse([], Response::HTTP_NO_CONTENT);
    }
}
