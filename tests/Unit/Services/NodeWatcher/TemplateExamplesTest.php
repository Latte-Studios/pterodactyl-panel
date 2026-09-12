<?php

namespace Pterodactyl\Tests\Unit\Services\NodeWatcher;

use Pterodactyl\Tests\TestCase;
use PHPUnit\Framework\Attributes\DataProvider;
use Pterodactyl\Services\NodeWatcher\TemplateExamples;

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
}
