<?php

namespace Database\Factories;

use Ramsey\Uuid\Uuid;
use Illuminate\Support\Str;
use Pterodactyl\Models\NodeWatcherWebhook;
use Illuminate\Database\Eloquent\Factories\Factory;

class NodeWatcherWebhookFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = NodeWatcherWebhook::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'uuid' => Uuid::uuid4()->toString(),
            'name' => 'Webhook_' . Str::random(8),
            'url' => 'https://example.com/hooks/' . Str::random(12),
            'secret' => NodeWatcherWebhook::generateSecret(),
            'events' => [NodeWatcherWebhook::EVENT_PRESSURE],
            'node_ids' => null,
            'body_template' => null,
            'enabled' => true,
        ];
    }
}
