<?php

namespace Pterodactyl\Tests\Integration\Http\Controllers\Admin\Settings;

use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Location;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Pterodactyl\Models\NodeWatcherWebhook;
use Pterodactyl\Tests\Integration\Http\HttpTestCase;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;
use Pterodactyl\Http\Controllers\Admin\Settings\NodeWatcherController;

class NodeWatcherControllerTest extends HttpTestCase
{
    private User $admin;

    public function setUp(): void
    {
        parent::setUp();

        // The admin layout prints the request time from a constant public/index.php defines.
        defined('LARAVEL_START') || define('LARAVEL_START', microtime(true));

        NodeWatcherWebhook::query()->delete();
        $this->admin = User::factory()->admin()->create();
    }

    public function testPageListsWebhooksAndIsAdminOnly(): void
    {
        $webhook = NodeWatcherWebhook::factory()->create(['name' => 'Ops channel']);

        $this->actingAs($this->admin)
            ->get(route('admin.settings.node-watcher'))
            ->assertOk()
            ->assertSee('Ops channel')
            ->assertDontSee($webhook->secret);

        $this->actingAs(User::factory()->create())
            ->get(route('admin.settings.node-watcher'))
            ->assertForbidden();
    }

    public function testHeartbeatIntervalIsStored(): void
    {
        $this->actingAs($this->admin)
            ->patch('/admin/settings/node-watcher', ['pterodactyl:node_watcher:heartbeat_interval' => 15])
            ->assertRedirect(route('admin.settings.node-watcher'));

        $this->assertSame('15', $this->app->make(SettingsRepositoryInterface::class)->get('settings::pterodactyl:node_watcher:heartbeat_interval', null));
    }

    public function testWebhookIsCreatedAndTheSecretIsShownOnce(): void
    {
        $node = Node::factory()->for(Location::factory())->create();

        $response = $this->actingAs($this->admin)->post(route('admin.settings.node-watcher.webhooks'), [
            'name' => 'Discord',
            'url' => 'https://discord.com/api/webhooks/1/abc',
            'events' => [NodeWatcherWebhook::EVENT_PRESSURE, NodeWatcherWebhook::EVENT_UNREACHABLE],
            'node_ids' => [$node->id],
            'body_template' => '{"content":"{{node.name}} is {{data.current}}"}',
            'enabled' => '1',
        ]);

        $response->assertRedirect(route('admin.settings.node-watcher'));

        $webhook = NodeWatcherWebhook::query()->where('name', 'Discord')->firstOrFail();
        $this->assertSame([NodeWatcherWebhook::EVENT_PRESSURE, NodeWatcherWebhook::EVENT_UNREACHABLE], $webhook->events);
        $this->assertSame([$node->id], $webhook->node_ids);
        $this->assertTrue($webhook->enabled);
        $this->assertSame(64, strlen($webhook->secret));
        $this->assertSame($webhook->secret, $response->getSession()->get(NodeWatcherController::SECRET_FLASH_KEY)['secret']);
    }

    public function testInvalidTemplateIsRejected(): void
    {
        $this->actingAs($this->admin)
            ->postJson(route('admin.settings.node-watcher.webhooks'), [
                'name' => 'Broken',
                'url' => 'https://example.com/hook',
                'events' => [NodeWatcherWebhook::EVENT_PRESSURE],
                'body_template' => '{"content": {{node.name}}}',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.0.meta.source_field', 'body_template')
            ->assertJsonPath('errors.0.detail', 'The rendered body is not valid JSON: Syntax error.');

        $this->assertSame(0, NodeWatcherWebhook::query()->count());
    }

    public function testWebhookIsUpdatedWithoutTouchingTheSecret(): void
    {
        $webhook = NodeWatcherWebhook::factory()->create();
        $secret = $webhook->secret;

        $this->actingAs($this->admin)
            ->patch(route('admin.settings.node-watcher.webhooks.update', ['webhook' => $webhook]), [
                'name' => 'Renamed',
                'url' => 'https://example.com/renamed',
                'events' => [NodeWatcherWebhook::EVENT_HEARTBEAT],
                'node_ids' => [],
                'body_template' => '',
            ])
            ->assertRedirect(route('admin.settings.node-watcher'));

        $webhook->refresh();
        $this->assertSame('Renamed', $webhook->name);
        $this->assertSame([NodeWatcherWebhook::EVENT_HEARTBEAT], $webhook->events);
        $this->assertNull($webhook->node_ids);
        $this->assertNull($webhook->body_template);
        $this->assertFalse($webhook->enabled);
        $this->assertSame($secret, $webhook->secret);
    }

    public function testSecretIsRotated(): void
    {
        $webhook = NodeWatcherWebhook::factory()->create();
        $secret = $webhook->secret;

        $response = $this->actingAs($this->admin)
            ->post(route('admin.settings.node-watcher.webhooks.rotate', ['webhook' => $webhook]))
            ->assertRedirect(route('admin.settings.node-watcher'));

        $webhook->refresh();
        $this->assertNotSame($secret, $webhook->secret);
        $this->assertSame($webhook->secret, $response->getSession()->get(NodeWatcherController::SECRET_FLASH_KEY)['secret']);
    }

    public function testDeliveryTestSendsAPingAndReportsTheOutcome(): void
    {
        Http::fakeSequence('example.com/*')->push('', 200)->push('', 500);
        $webhook = NodeWatcherWebhook::factory()->create(['url' => 'https://example.com/hook']);

        $this->actingAs($this->admin)
            ->postJson(route('admin.settings.node-watcher.webhooks.test', ['webhook' => $webhook]))
            ->assertOk()
            ->assertJsonPath('status', 200)
            ->assertJsonPath('error', null);

        Http::assertSent(fn (Request $request) => $request->hasHeader('X-Latte-Event', 'ping') && json_decode($request->body(), true)['event'] === 'ping');
        $this->assertSame(200, $webhook->refresh()->last_status);

        $this->actingAs($this->admin)
            ->postJson(route('admin.settings.node-watcher.webhooks.test', ['webhook' => $webhook]))
            ->assertStatus(502)
            ->assertJsonPath('status', 500);
    }

    public function testWebhookIsDeleted(): void
    {
        $webhook = NodeWatcherWebhook::factory()->create();

        $this->actingAs($this->admin)
            ->delete(route('admin.settings.node-watcher.webhooks.delete', ['webhook' => $webhook]))
            ->assertRedirect(route('admin.settings.node-watcher'));

        $this->assertNull(NodeWatcherWebhook::query()->find($webhook->id));
    }

    public function testPreviewRendersTheTemplateAgainstTheSamplePayload(): void
    {
        $this->actingAs($this->admin)
            ->postJson(route('admin.settings.node-watcher.preview'), ['body_template' => '{"node":"{{node.name}}"}'])
            ->assertOk()
            ->assertJsonPath('valid', true)
            ->assertJsonPath('body', "{\n    \"node\": \"example-node\"\n}");

        $this->actingAs($this->admin)
            ->postJson(route('admin.settings.node-watcher.preview'), ['body_template' => '{"node": {{node.name}}}'])
            ->assertOk()
            ->assertJsonPath('valid', false);
    }
}
