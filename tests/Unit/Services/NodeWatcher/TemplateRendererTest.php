<?php

namespace Pterodactyl\Tests\Unit\Services\NodeWatcher;

use Pterodactyl\Tests\TestCase;
use Pterodactyl\Services\NodeWatcher\TemplateRenderer;
use Pterodactyl\Exceptions\Service\NodeWatcher\InvalidTemplateException;

class TemplateRendererTest extends TestCase
{
    private TemplateRenderer $renderer;

    private array $payload = [
        'event' => 'host.pressure',
        'node' => ['name' => 'br-sp-01', 'fqdn' => 'node.example.com'],
        'data' => [
            'current' => 'critical',
            'flag' => true,
            'snapshot' => [
                'cpu' => ['percent' => 91.256],
                'disks' => [['path' => '/', 'percent' => 60]],
            ],
        ],
    ];

    public function setUp(): void
    {
        parent::setUp();

        $this->renderer = new TemplateRenderer();
    }

    public function testScalarPlaceholdersAreSubstituted()
    {
        $this->assertSame(
            '{"text":"br-sp-01 is critical on host.pressure"}',
            $this->renderer->render('{"text":"{{node.name}} is {{data.current}} on {{ event }}"}', $this->payload),
        );
    }

    public function testStringValuesAreEscapedForJson()
    {
        $payload = ['node' => ['name' => "quo\"te\\back\nline"]];

        $rendered = $this->renderer->render('{"name":"{{node.name}}"}', $payload);

        $this->assertSame(['name' => "quo\"te\\back\nline"], json_decode($rendered, true));
    }

    public function testJsonPlaceholderSerializesSubtrees()
    {
        $this->assertSame(
            '{"disks":[{"path":"/","percent":60}]}',
            $this->renderer->render('{"disks":{{json data.snapshot.disks}}}', $this->payload),
        );

        $this->assertSame(
            json_encode($this->payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            $this->renderer->render('{{json .}}', $this->payload),
        );
    }

    public function testPercentPlaceholderFormatsWithOneDecimal()
    {
        $this->assertSame('91.3%', $this->renderer->render('{{percent data.snapshot.cpu.percent}}%', $this->payload));
        $this->assertSame('0.0%', $this->renderer->render('{{percent data.missing}}%', $this->payload));
    }

    public function testBooleansAndArraysRenderInsideStrings()
    {
        $this->assertSame('true', $this->renderer->render('{{data.flag}}', $this->payload));
        $this->assertSame(
            '[{\"path\":\"/\",\"percent\":60}]',
            $this->renderer->render('{{data.snapshot.disks}}', $this->payload),
        );
    }

    public function testUnknownPathsDoNotBreakTheDelivery()
    {
        $this->assertSame('""', $this->renderer->render('"{{node.nope}}"', $this->payload));
        $this->assertSame('null', $this->renderer->render('{{json node.nope}}', $this->payload));
    }

    public function testFallbackIsUsedWhenThePathIsMissing()
    {
        $this->assertSame('"n/a"', $this->renderer->render('"{{node.nope|n/a}}"', $this->payload));
        $this->assertSame('"n/a"', $this->renderer->render('"{{ node.nope | n/a }}"', $this->payload));
        $this->assertSame('""', $this->renderer->render('"{{node.nope|}}"', $this->payload));
        $this->assertSame('?%', $this->renderer->render('{{percent node.nope|?}}%', $this->payload));
        $this->assertSame('[]', $this->renderer->render('{{json node.nope|[]}}', $this->payload));
        $this->assertSame('so "raw"', $this->renderer->render('{{node.nope|so "raw"}}', $this->payload));
    }

    public function testFallbackIsIgnoredWhenThePathExists()
    {
        $this->assertSame('br-sp-01', $this->renderer->render('{{node.name|n/a}}', $this->payload));
        $this->assertSame('91.3', $this->renderer->render('{{percent data.snapshot.cpu.percent|?}}', $this->payload));
        $this->assertSame('true', $this->renderer->render('{{data.flag|n/a}}', $this->payload));
    }

    public function testTextWithoutPlaceholdersIsLeftAlone()
    {
        $template = '{"a":"{{not a placeholder","b":"{{ }}"}';

        $this->assertSame($template, $this->renderer->render($template, $this->payload));
    }

    public function testValidateAcceptsTemplatesThatRenderToJson()
    {
        $this->renderer->validate('{"content":"{{node.name}}","embeds":{{json data.snapshot.disks}}}', $this->payload);

        $this->addToAssertionCount(1);
    }

    public function testValidateRejectsTemplatesThatDoNotRenderToJson()
    {
        $this->expectException(InvalidTemplateException::class);
        $this->expectExceptionMessage('not valid JSON');

        $this->renderer->validate('{"content": {{node.name}}}', $this->payload);
    }
}
