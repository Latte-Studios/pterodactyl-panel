<?php

namespace Pterodactyl\Tests\Unit\Services\NodeWatcher;

use Pterodactyl\Tests\TestCase;
use PHPUnit\Framework\Attributes\DataProvider;
use Pterodactyl\Services\NodeWatcher\TemplateExamples;
use Pterodactyl\Services\NodeWatcher\TemplateRenderer;

class TemplateExamplesTest extends TestCase
{
    #[DataProvider('urlProvider')]
    public function testKnownReceiversAreMappedToTheirExample(string $url, ?string $expected)
    {
        $this->assertSame($expected, TemplateExamples::forUrl($url));
    }

    public static function urlProvider(): array
    {
        return [
            ['https://discord.com/api/webhooks/1/abc', 'discord'],
            ['https://DISCORD.com/api/webhooks/1/abc', 'discord'],
            ['https://canary.discord.com/api/webhooks/1/abc', 'discord'],
            ['https://discordapp.com/api/webhooks/1/abc', 'discord'],
            ['https://hooks.slack.com/services/T0/B0/x', 'slack'],
            ['https://discord.com.evil.example/api/webhooks/1/abc', null],
            ['https://notdiscord.com/hook', null],
            ['https://example.com/hook', null],
            ['not a url', null],
            ['', null],
        ];
    }

    public function testEveryRequiredHostHasAnExample()
    {
        foreach (array_keys(TemplateExamples::hosts()) as $key) {
            $this->assertArrayHasKey($key, TemplateExamples::all());
        }
    }

    /**
     * One template serves every event, so each example has to render to valid
     * JSON whatever the payload carries, including the test ping that has no
     * node and no data at all.
     */
    #[DataProvider('payloadProvider')]
    public function testExamplesRenderToJsonForEveryEvent(array $payload)
    {
        $renderer = new TemplateRenderer();

        foreach (TemplateExamples::all() as $key => $example) {
            $rendered = $renderer->render($example['body'], $payload);

            $this->assertNotNull(json_decode($rendered, true), sprintf('%s example on %s: %s', $key, $payload['event'], $rendered));
            $this->assertStringNotContainsString('****', $rendered, sprintf('%s example on %s renders an empty bold', $key, $payload['event']));
        }
    }

    public static function payloadProvider(): array
    {
        $panel = ['url' => 'https://panel.example.com', 'version' => '1.16.0'];
        $node = ['id' => 1, 'uuid' => 'a1b2', 'name' => 'br-sp-01', 'fqdn' => 'node.example.com', 'location' => 'br'];

        return [
            'ping' => [['event' => 'ping', 'delivery' => 'd', 'sent_at' => 'now', 'panel' => $panel, 'node' => null, 'data' => []]],
            'heartbeat' => [['event' => 'host.heartbeat', 'delivery' => 'd', 'sent_at' => 'now', 'panel' => $panel, 'node' => $node, 'data' => ['snapshot' => ['cpu' => ['percent' => 1.5], 'memory' => ['percent' => 40.0], 'servers' => ['running' => 3, 'total' => 5], 'pressure' => ['level' => 'ok']]]]],
            'unreachable' => [['event' => 'node.unreachable', 'delivery' => 'd', 'sent_at' => 'now', 'panel' => $panel, 'node' => $node, 'data' => ['failures' => 3, 'since' => 'now', 'last_error' => 'cURL error 7: Failed to connect']]],
            'pressure' => [['event' => 'host.pressure', 'delivery' => 'd', 'sent_at' => 'now', 'panel' => $panel, 'node' => $node, 'data' => ['previous' => 'warning', 'current' => 'critical', 'snapshot' => ['cpu' => ['percent' => 91.3], 'memory' => ['percent' => 95.3], 'servers' => ['running' => 19, 'total' => 24], 'pressure' => ['level' => 'critical']]]]],
        ];
    }
}
