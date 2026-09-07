<?php

namespace Pterodactyl\Tests\Integration\Jobs\NodeWatcher;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Pterodactyl\Models\NodeWatcherWebhook;
use Pterodactyl\Services\NodeWatcher\WebhookDeliverer;
use Pterodactyl\Tests\Integration\IntegrationTestCase;
use Pterodactyl\Jobs\NodeWatcher\SendNodeWatcherWebhook;

class SendNodeWatcherWebhookTest extends IntegrationTestCase
{
    private NodeWatcherWebhook $webhook;

    public function setUp(): void
    {
        parent::setUp();

        $this->webhook = NodeWatcherWebhook::factory()->create(['url' => 'https://hooks.example.com/latte']);
    }

    public function testSuccessfulDeliveryIsSignedAndRecorded()
    {
        Http::fake(['hooks.example.com/*' => Http::response('', 204)]);

        $body = '{"event":"host.pressure","data":{"current":"critical"}}';
        $this->handle($body);

        Http::assertSent(function (Request $request) use ($body) {
            return $request->url() === 'https://hooks.example.com/latte'
                && $request->method() === 'POST'
                && $request->body() === $body
                && $request->hasHeader('Content-Type', 'application/json')
                && $request->hasHeader(WebhookDeliverer::HEADER_EVENT, 'host.pressure')
                && $request->hasHeader(WebhookDeliverer::HEADER_DELIVERY, 'delivery-1')
                && $request->hasHeader(WebhookDeliverer::HEADER_SIGNATURE, 'sha256=' . hash_hmac('sha256', $body, $this->webhook->secret))
                && str_starts_with($request->header('User-Agent')[0], 'Latte-Pterodactyl-NodeWatcher/');
        });

        $this->webhook->refresh();
        $this->assertSame(204, $this->webhook->last_status);
        $this->assertNull($this->webhook->last_error);
        $this->assertNotNull($this->webhook->last_delivery_at);
    }

    public function testClientErrorIsRecordedWithoutRetrying()
    {
        Http::fake(['hooks.example.com/*' => Http::response('nope', 404)]);

        $this->handle('{}');

        $this->webhook->refresh();
        $this->assertSame(404, $this->webhook->last_status);
        $this->assertSame('HTTP 404 Not Found', $this->webhook->last_error);
    }

    public function testServerErrorIsRecordedAndRetried()
    {
        Http::fake(['hooks.example.com/*' => Http::response('', 503)]);

        $this->expectException(\RuntimeException::class);

        try {
            $this->handle('{}');
        } finally {
            $this->webhook->refresh();
            $this->assertSame(503, $this->webhook->last_status);
            $this->assertSame('HTTP 503 Service Unavailable', $this->webhook->last_error);
        }
    }

    public function testConnectionFailureIsRecordedAndRetried()
    {
        Http::fake(['hooks.example.com/*' => fn () => throw new \Illuminate\Http\Client\ConnectionException('cURL error 28: timed out')]);

        $this->expectException(\RuntimeException::class);

        try {
            $this->handle('{}');
        } finally {
            $this->webhook->refresh();
            $this->assertSame(0, $this->webhook->last_status);
            $this->assertSame('cURL error 28: timed out', $this->webhook->last_error);
        }
    }

    public function testRedirectsAreNotFollowed()
    {
        Http::fake(['hooks.example.com/*' => Http::response('', 302, ['Location' => 'https://evil.example.com/'])]);

        $this->handle('{}');

        Http::assertSentCount(1);
        $this->assertSame(302, $this->webhook->refresh()->last_status);
    }

    private function handle(string $body): void
    {
        $job = new SendNodeWatcherWebhook($this->webhook, 'host.pressure', 'delivery-1', $body);
        $job->handle($this->app->make(WebhookDeliverer::class));
    }
}
