<?php

namespace Pterodactyl\Http\Requests\Admin\Settings;

use Illuminate\Validation\Validator;
use Pterodactyl\Models\NodeWatcherWebhook;
use Pterodactyl\Http\Requests\Admin\AdminFormRequest;
use Pterodactyl\Services\NodeWatcher\TemplateRenderer;
use Pterodactyl\Services\NodeWatcher\NodeWatcherService;
use Pterodactyl\Exceptions\Service\NodeWatcher\InvalidTemplateException;

class NodeWatcherWebhookFormRequest extends AdminFormRequest
{
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:100',
            'url' => 'required|string|url:http,https|max:2000',
            'events' => 'required|array|min:1',
            'events.*' => 'string|in:' . implode(',', NodeWatcherWebhook::EVENTS),
            'node_ids' => 'nullable|array',
            'node_ids.*' => 'integer|exists:nodes,id',
            'body_template' => 'nullable|string|max:65535',
            'enabled' => 'sometimes|boolean',
        ];
    }

    /**
     * A custom body has to render to valid JSON, which the rules above cannot
     * express on their own.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $template = $this->input('body_template');
            if (!is_string($template) || trim($template) === '') {
                return;
            }

            try {
                $this->container->make(TemplateRenderer::class)->validate(
                    $template,
                    $this->container->make(NodeWatcherService::class)->samplePayload(),
                );
            } catch (InvalidTemplateException $exception) {
                $validator->errors()->add('body_template', $exception->getMessage());
            }
        });
    }

    /**
     * Returns the attributes to store on the model, with the form quirks removed:
     * an unchecked checkbox is absent, an empty node list means every node and
     * an empty template means the default body.
     */
    public function normalize(?array $only = null): array
    {
        $template = $this->input('body_template');
        $nodes = array_values(array_map('intval', $this->input('node_ids') ?? []));

        return [
            'name' => $this->input('name'),
            'url' => $this->input('url'),
            'events' => array_values(array_unique($this->input('events'))),
            'node_ids' => empty($nodes) ? null : $nodes,
            'body_template' => is_string($template) && trim($template) !== '' ? $template : null,
            'enabled' => $this->boolean('enabled'),
        ];
    }
}
