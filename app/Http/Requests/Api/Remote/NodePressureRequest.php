<?php

namespace Pterodactyl\Http\Requests\Api\Remote;

use Illuminate\Foundation\Http\FormRequest;

class NodePressureRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * The snapshot is forwarded to the webhooks as the daemon sent it, so only
     * its shape is checked here.
     */
    public function rules(): array
    {
        return [
            'previous' => ['required', 'string', 'in:ok,warning,critical'],
            'current' => ['required', 'string', 'in:ok,warning,critical'],
            'snapshot' => ['required', 'array'],
            'snapshot.timestamp' => ['required', 'string'],
            'snapshot.cpu' => ['required', 'array'],
            'snapshot.memory' => ['required', 'array'],
            'snapshot.disks' => ['present', 'array'],
            'snapshot.servers' => ['required', 'array'],
            'snapshot.pressure' => ['required', 'array'],
            'snapshot.pressure.level' => ['required', 'string', 'in:ok,warning,critical'],
        ];
    }
}
