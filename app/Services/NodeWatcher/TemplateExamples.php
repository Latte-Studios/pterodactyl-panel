<?php

namespace Pterodactyl\Services\NodeWatcher;

/**
 * Starting points for custom webhook bodies, offered in the admin area.
 */
class TemplateExamples
{
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
