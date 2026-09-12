<?php

namespace Pterodactyl\Tests\Integration\Http\Middleware;

use Pterodactyl\Models\User;
use Pterodactyl\Models\ApiKey;
use Pterodactyl\Services\Sso\GoogleSsoService;
use Pterodactyl\Tests\Integration\Http\HttpTestCase;
use Pterodactyl\Http\Middleware\RequireTwoFactorAuthentication;

class RequireTwoFactorAuthenticationTest extends HttpTestCase
{
    public function setUp(): void
    {
        parent::setUp();

        config(['pterodactyl.auth.2fa_required' => RequireTwoFactorAuthentication::LEVEL_ALL]);
    }

    public function testUserWithoutAnySecondFactorIsSentToTheirAccount(): void
    {
        $this->actingAs(User::factory()->create())
            ->withHeaders(['Accept' => 'text/html'])
            ->get('/')
            ->assertRedirect('/account');
    }

    public function testUserWithTotpPasses(): void
    {
        $this->actingAs(User::factory()->create(['use_totp' => true, 'totp_secret' => encrypt(str_repeat('a', 16))]))
            ->withHeaders(['Accept' => 'text/html'])
            ->get('/')
            ->assertOk();
    }

    public function testLinkedUserWithAGoogleSessionPasses(): void
    {
        $this->actingAs($this->linkedUser())
            ->withSession([GoogleSsoService::SESSION_AUTHENTICATED_AT => now()->toIso8601String()])
            ->withHeaders(['Accept' => 'text/html'])
            ->get('/')
            ->assertOk();
    }

    public function testLinkedUserWithoutAGoogleSessionIsSentToReauthenticate(): void
    {
        // Signed in with the password alone: the link is not proof of a second factor.
        $this->actingAs($this->linkedUser())
            ->withHeaders(['Accept' => 'text/html'])
            ->get('/server/abc')
            ->assertRedirect('/auth/sso/google?redirect=' . urlencode('/server/abc'));
    }

    public function testLinkedUserWithoutAGoogleSessionGetsTheApiException(): void
    {
        $this->actingAs($this->linkedUser())
            ->getJson('/api/client')
            ->assertStatus(400)
            ->assertJsonPath('errors.0.code', 'TwoFactorAuthRequiredException');
    }

    public function testLinkedUserWithAnApiKeyPasses(): void
    {
        $user = $this->linkedUser();
        $key = ApiKey::factory()->create([
            'user_id' => $user->id,
            'key_type' => ApiKey::TYPE_ACCOUNT,
            'identifier' => ApiKey::generateTokenIdentifier(ApiKey::TYPE_ACCOUNT),
        ]);

        $this->withHeader('Authorization', 'Bearer ' . $key->identifier . decrypt($key->token))
            ->getJson('/api/client')
            ->assertOk();
    }

    private function linkedUser(): User
    {
        return User::factory()->create(['google_subject' => 'sub-2fa-' . strtolower(str_random(8))]);
    }
}
