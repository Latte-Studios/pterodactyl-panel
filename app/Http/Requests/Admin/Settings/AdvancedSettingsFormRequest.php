<?php

namespace Pterodactyl\Http\Requests\Admin\Settings;

use Pterodactyl\Http\Requests\Admin\AdminFormRequest;

class AdvancedSettingsFormRequest extends AdminFormRequest
{
    /**
     * Return all the rules to apply to this request's data.
     */
    public function rules(): array
    {
        return [
            'recaptcha:enabled' => 'required|in:true,false',
            'recaptcha:secret_key' => 'required|string|max:191',
            'recaptcha:website_key' => 'required|string|max:191',
            'pterodactyl:guzzle:timeout' => 'required|integer|between:1,60',
            'pterodactyl:guzzle:connect_timeout' => 'required|integer|between:1,60',
            'pterodactyl:client_features:allocations:enabled' => 'required|in:true,false',
            'pterodactyl:client_features:allocations:range_start' => [
                'nullable',
                'required_if:pterodactyl:client_features:allocations:enabled,true',
                'integer',
                'between:1024,65535',
            ],
            'pterodactyl:client_features:allocations:range_end' => [
                'nullable',
                'required_if:pterodactyl:client_features:allocations:enabled,true',
                'integer',
                'between:1024,65535',
                'gt:pterodactyl:client_features:allocations:range_start',
            ],
            'services:google:enabled' => 'required|in:true,false',
            'services:google:client_id' => 'nullable|required_if:services:google:enabled,true|string|max:191',
            'services:google:client_secret' => 'nullable|string|max:191',
            'services:google:allowed_domains' => [
                'nullable',
                'required_if:services:google:enabled,true',
                'string',
                'max:500',
                'regex:/^\s*[a-z0-9.-]+\.[a-z]{2,}(\s*,\s*[a-z0-9.-]+\.[a-z]{2,})*\s*$/i',
            ],
            'services:google:auto_create' => 'required|in:true,false',
        ];
    }

    /**
     * An empty client secret keeps the one already stored, and the domain list
     * is stored lowercased without whitespace so the service can split it.
     */
    public function normalize(?array $only = null): array
    {
        $values = parent::normalize($only);

        if (empty($values['services:google:client_secret'])) {
            unset($values['services:google:client_secret']);
        }

        if (array_key_exists('services:google:allowed_domains', $values)) {
            $domains = array_filter(array_map('trim', explode(',', (string) $values['services:google:allowed_domains'])));
            $values['services:google:allowed_domains'] = mb_strtolower(implode(',', $domains));
        }

        return $values;
    }

    public function attributes(): array
    {
        return [
            'recaptcha:enabled' => 'reCAPTCHA Enabled',
            'recaptcha:secret_key' => 'reCAPTCHA Secret Key',
            'recaptcha:website_key' => 'reCAPTCHA Website Key',
            'pterodactyl:guzzle:timeout' => 'HTTP Request Timeout',
            'pterodactyl:guzzle:connect_timeout' => 'HTTP Connection Timeout',
            'pterodactyl:client_features:allocations:enabled' => 'Auto Create Allocations Enabled',
            'pterodactyl:client_features:allocations:range_start' => 'Starting Port',
            'pterodactyl:client_features:allocations:range_end' => 'Ending Port',
            'services:google:enabled' => 'Google SSO Enabled',
            'services:google:client_id' => 'Google Client ID',
            'services:google:client_secret' => 'Google Client Secret',
            'services:google:allowed_domains' => 'Google Allowed Domains',
            'services:google:auto_create' => 'Google Auto-Create Users',
        ];
    }
}
