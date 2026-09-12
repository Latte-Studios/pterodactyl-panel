<?php

namespace Pterodactyl\Services\NodeWatcher;

/**
 * Starting points for custom webhook bodies, offered in the admin area.
 */
class TemplateExamples
{
    /**
     * Services that reject the default payload, mapped to the example that
     * produces a body they accept. A host matches itself and any subdomain.
     */
    private const HOSTS = [
        'discord' => ['discord.com', 'discordapp.com'],
        'slack' => ['hooks.slack.com'],
    ];

    /**
     * Returns the key of the example a webhook URL requires, or null when the
     * receiver is not known to reject the default payload.
     */
    public static function forUrl(string $url): ?string
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        if ($host === '') {
            return null;
        }

        foreach (self::HOSTS as $key => $hosts) {
            foreach ($hosts as $candidate) {
                if ($host === $candidate || str_ends_with($host, '.' . $candidate)) {
                    return $key;
                }
            }
        }

        return null;
    }

    /**
     * The hosts that require a template, keyed by example, for the admin area.
     *
     * @return array<string, string[]>
     */
    public static function hosts(): array
    {
        return self::HOSTS;
    }

    /**
     * @return array<string, array{label: string, body: string}>
     */
    public static function all(): array
    {
        return [
            'discord' => [
                'label' => 'Discord',
                'body' => <<<'JSON'
{
  "username": "Node Watcher",
  "content": "**{{node.name}}** is now **{{data.current}}** (was {{data.previous}})",
  "embeds": [
    {
      "title": "{{event}} on {{node.name}}",
      "url": "{{panel.url}}/admin/nodes/view/{{node.id}}",
      "description": "CPU {{percent data.snapshot.cpu.percent}}% · Memory {{percent data.snapshot.memory.percent}}% · Servers running {{data.snapshot.servers.running}}/{{data.snapshot.servers.total}}",
      "footer": { "text": "{{node.fqdn}} · {{sent_at}}" }
    }
  ]
}
JSON,
            ],
            'slack' => [
                'label' => 'Slack',
                'body' => <<<'JSON'
{
  "text": "{{node.name}} is now {{data.current}} (was {{data.previous}})",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*<{{panel.url}}/admin/nodes/view/{{node.id}}|{{node.name}}>* is now *{{data.current}}*\nCPU {{percent data.snapshot.cpu.percent}}% · Memory {{percent data.snapshot.memory.percent}}% · Servers running {{data.snapshot.servers.running}}/{{data.snapshot.servers.total}}"
      }
    },
    {
      "type": "context",
      "elements": [ { "type": "mrkdwn", "text": "{{node.fqdn}} · {{sent_at}}" } ]
    }
  ]
}
JSON,
            ],
            'generic' => [
                'label' => 'Generic',
                'body' => <<<'JSON'
{
  "event": "{{event}}",
  "node": "{{node.name}}",
  "level": "{{data.current}}",
  "cpu_percent": {{percent data.snapshot.cpu.percent}},
  "memory_percent": {{percent data.snapshot.memory.percent}},
  "snapshot": {{json data.snapshot}}
}
JSON,
            ],
        ];
    }
}
