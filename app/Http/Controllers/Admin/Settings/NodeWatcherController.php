<?php

namespace Pterodactyl\Http\Controllers\Admin\Settings;

use Illuminate\View\View;
use Illuminate\Http\Request;
use Pterodactyl\Models\Node;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Prologue\Alerts\AlertsMessageBag;
use Pterodactyl\Models\NodeWatcherWebhook;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Services\NodeWatcher\TemplateExamples;
use Pterodactyl\Services\NodeWatcher\TemplateRenderer;
use Pterodactyl\Services\NodeWatcher\WebhookDeliverer;
use Pterodactyl\Services\NodeWatcher\NodeWatcherService;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;
use Pterodactyl\Exceptions\Service\NodeWatcher\InvalidTemplateException;
use Pterodactyl\Http\Requests\Admin\Settings\NodeWatcherWebhookFormRequest;
use Pterodactyl\Http\Requests\Admin\Settings\NodeWatcherSettingsFormRequest;

class NodeWatcherController extends Controller
{
    private const HEARTBEAT_SETTING = 'settings::pterodactyl:node_watcher:heartbeat_interval';

    /**
     * The session key a freshly generated secret is flashed under so that it can
     * be shown exactly once.
     */
    public const SECRET_FLASH_KEY = 'node_watcher:secret';

    public function __construct(
        private AlertsMessageBag $alert,
        private SettingsRepositoryInterface $settings,
        private NodeWatcherService $service,
        private WebhookDeliverer $deliverer,
        private TemplateRenderer $renderer,
    ) {
    }

    /**
     * Render the Node Watcher settings UI.
     */
    public function index(): View
    {
        return view('admin.settings.node-watcher', [
            'webhooks' => NodeWatcherWebhook::query()->orderBy('name')->get(),
            'nodes' => Node::query()->orderBy('name')->get(['id', 'name']),
            'heartbeatInterval' => (int) config('pterodactyl.node_watcher.heartbeat_interval'),
            'examples' => TemplateExamples::all(),
            'requiredHosts' => TemplateExamples::hosts(),
        ]);
    }

    /**
     * Update the settings that apply to every webhook.
     *
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     */
    public function update(NodeWatcherSettingsFormRequest $request): RedirectResponse
    {
        $this->settings->set(self::HEARTBEAT_SETTING, (string) $request->input('pterodactyl:node_watcher:heartbeat_interval'));
        $this->alert->success('Node Watcher settings have been updated successfully.')->flash();

        return redirect()->route('admin.settings.node-watcher');
    }

    /**
     * Register a new webhook. The generated secret is shown on the next page
     * load and never again.
     *
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     */
    public function store(NodeWatcherWebhookFormRequest $request): RedirectResponse
    {
        $webhook = NodeWatcherWebhook::create($request->normalize());

        $this->flashSecret($webhook);
        $this->alert->success('The webhook has been registered.')->flash();

        return redirect()->route('admin.settings.node-watcher');
    }

    /**
     * Update an existing webhook.
     *
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     */
    public function updateWebhook(NodeWatcherWebhookFormRequest $request, NodeWatcherWebhook $webhook): RedirectResponse
    {
        $webhook->fill($request->normalize())->save();

        $this->alert->success('The webhook has been updated.')->flash();

        return redirect()->route('admin.settings.node-watcher');
    }

    /**
     * Replace the secret of a webhook and show the new one once.
     *
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     */
    public function rotate(NodeWatcherWebhook $webhook): RedirectResponse
    {
        $webhook->secret = NodeWatcherWebhook::generateSecret();
        $webhook->save();

        $this->flashSecret($webhook);
        $this->alert->success('The secret has been rotated. Update the receiver before the next delivery.')->flash();

        return redirect()->route('admin.settings.node-watcher');
    }

    /**
     * Deliver a "ping" event to the webhook right away and report the outcome.
     */
    public function test(NodeWatcherWebhook $webhook): JsonResponse
    {
        $payload = $this->service->payload(NodeWatcherWebhook::EVENT_PING, null, []);
        $body = $this->service->body($webhook, $payload);

        $result = $this->deliverer->deliver($webhook, NodeWatcherWebhook::EVENT_PING, $payload['delivery'], $body);
        $webhook->recordDelivery($result);

        // Always 200: the outcome of the delivery is in the body. Answering with
        // a 5xx would describe the receiver, not this endpoint, and a proxy in
        // front of the Panel (Cloudflare does this) replaces the body of an
        // origin 502 with its own error page, hiding the reason from the admin.
        return new JsonResponse([
            'ok' => $result->isSuccessful(),
            'status' => $result->status,
            'duration_ms' => $result->durationMs,
            'error' => $result->error,
        ]);
    }

    /**
     * Remove a webhook.
     */
    public function destroy(NodeWatcherWebhook $webhook): RedirectResponse
    {
        $webhook->delete();

        $this->alert->success('The webhook has been deleted.')->flash();

        return redirect()->route('admin.settings.node-watcher');
    }

    /**
     * Render a template against the sample payload so that the editor can show
     * what a receiver would get.
     */
    public function preview(Request $request): JsonResponse
    {
        $template = (string) $request->input('body_template', '');
        $payload = $this->service->samplePayload();

        if (trim($template) === '') {
            return new JsonResponse([
                'valid' => true,
                'body' => json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            ]);
        }

        $rendered = $this->renderer->render($template, $payload);

        try {
            $this->renderer->validate($template, $payload);
        } catch (InvalidTemplateException $exception) {
            return new JsonResponse(['valid' => false, 'body' => $rendered, 'error' => $exception->getMessage()]);
        }

        return new JsonResponse([
            'valid' => true,
            'body' => json_encode(json_decode($rendered), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        ]);
    }

    private function flashSecret(NodeWatcherWebhook $webhook): void
    {
        session()->flash(self::SECRET_FLASH_KEY, [
            'name' => $webhook->name,
            'secret' => $webhook->secret,
        ]);
    }
}
