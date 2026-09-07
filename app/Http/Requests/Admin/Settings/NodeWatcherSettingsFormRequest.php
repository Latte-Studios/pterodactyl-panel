<?php

namespace Pterodactyl\Http\Requests\Admin\Settings;

use Pterodactyl\Http\Requests\Admin\AdminFormRequest;

class NodeWatcherSettingsFormRequest extends AdminFormRequest
{
    public function rules(): array
    {
        return [
            'pterodactyl:node_watcher:heartbeat_interval' => 'required|integer|between:0,1440',
        ];
    }

    public function attributes(): array
    {
        return [
            'pterodactyl:node_watcher:heartbeat_interval' => 'Heartbeat Interval',
        ];
    }
}
