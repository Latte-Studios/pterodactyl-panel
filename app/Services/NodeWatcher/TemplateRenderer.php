<?php

namespace Pterodactyl\Services\NodeWatcher;

use Illuminate\Support\Arr;
use Pterodactyl\Exceptions\Service\NodeWatcher\InvalidTemplateException;

/**
 * Renders the custom body of a webhook. This is deliberately not Blade: a
 * template only substitutes placeholders and can never run code.
 *
 * Supported placeholders, where "path" is a dot separated path into the default
 * payload and "." is the payload itself:
 *
 *   {{path}}          the value, escaped for use inside a JSON string
 *   {{json path}}     the value serialized as JSON
 *   {{percent path}}  the value formatted as a number with one decimal place
 *   {{path|text}}     "text", verbatim, when the path is missing from the payload;
 *                     works with json and percent too
 */
class TemplateRenderer
{
    private const PATTERN = '/\{\{\s*(?:(json|percent)\s+)?(\.|[A-Za-z0-9_\-]+(?:\.[A-Za-z0-9_\-]+)*)\s*(?:\|((?:(?!\}\}).)*))?\}\}/';

    /**
     * Replaces every placeholder in the template with the matching value from
     * the payload. Unknown paths become the fallback when one is given, and an
     * empty string (or null for {{json}}) otherwise, so that a typo never
     * blocks a delivery.
     */
    public function render(string $template, array $payload): string
    {
        return preg_replace_callback(self::PATTERN, function (array $match) use ($payload) {
            $value = $this->resolve($payload, $match[2]);

            if (is_null($value) && isset($match[3])) {
                return trim($match[3]);
            }

            return match ($match[1]) {
                'json' => $this->json($value),
                'percent' => number_format((float) ($value ?? 0), 1, '.', ''),
                default => $this->escape($value),
            };
        }, $template);
    }

    /**
     * Renders the template against a sample payload and makes sure the result is
     * valid JSON, since that is what every receiver is told to expect.
     *
     * @throws InvalidTemplateException
     */
    public function validate(string $template, array $payload): void
    {
        json_decode($this->render($template, $payload), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new InvalidTemplateException(sprintf('The rendered body is not valid JSON: %s.', json_last_error_msg()));
        }
    }

    private function resolve(array $payload, string $path): mixed
    {
        return $path === '.' ? $payload : Arr::get($payload, $path);
    }

    private function json(mixed $value): string
    {
        return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: 'null';
    }

    /**
     * Escapes a value so it can be dropped between the quotes of a JSON string.
     * The quotes themselves are left to the template so that a placeholder can
     * also be embedded in the middle of a longer message.
     */
    private function escape(mixed $value): string
    {
        if (is_null($value)) {
            return '';
        }

        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        if (is_array($value)) {
            $value = $this->json($value);
        }

        $encoded = json_encode((string) $value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        return $encoded === false ? '' : substr($encoded, 1, -1);
    }
}
