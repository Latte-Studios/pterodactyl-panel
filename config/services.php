<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Google Workspace SSO
    |--------------------------------------------------------------------------
    |
    | These values are the defaults; the Admin > Settings > Advanced page
    | stores the real ones in the settings table and they override whatever
    | is here at boot (see SettingsServiceProvider). The redirect URL is not
    | configurable: it is always /auth/sso/google/callback on the panel. Only
    | Google Workspace accounts are accepted: the hosted domain claim has to be
    | present and listed in allowed_domains, a personal account never passes.
    |
    */

    'google' => [
        'enabled' => env('GOOGLE_SSO_ENABLED', false),
        'client_id' => env('GOOGLE_SSO_CLIENT_ID'),
        'client_secret' => env('GOOGLE_SSO_CLIENT_SECRET'),
        'redirect' => '/auth/sso/google/callback',
        'allowed_domains' => env('GOOGLE_SSO_ALLOWED_DOMAINS', 'lattestudio.net'),
        'auto_create' => env('GOOGLE_SSO_AUTO_CREATE', true),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],
];
