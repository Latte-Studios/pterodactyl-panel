<?php

namespace Pterodactyl\Tests\Integration\Api\Client;

use Pterodactyl\Models\User;
use Pterodactyl\Services\Sso\GoogleSsoService;

class GoogleSsoControllerTest extends ClientApiIntegrationTestCase
{
    public function testUserCanUnlinkTheirGoogleAccount(): void
    {
        $tag = strtolower(str_random(8));
        $user = User::factory()->create([
            'google_subject' => 'sub-client-' . $tag,
            'google_email' => 'client.' . $tag . '@lattestudio.net',
            'google_linked_at' => now(),
        ]);

        $this->actingAs($user)->deleteJson('/api/client/account/sso/google')->assertNoContent();

        $user->refresh();
        $this->assertNull($user->google_subject);
        $this->assertNull($user->google_email);
        $this->assertNull($user->google_linked_at);

        $this->assertActivityFor('user:account.sso-unlinked', $user, $user);
    }

    public function testUnlinkingWithoutALinkIsANoOp(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->deleteJson('/api/client/account/sso/google')->assertNoContent();

        $this->assertNull($user->refresh()->google_subject);
    }

    public function testUnlinkingForgetsTheGoogleSessionMark(): void
    {
        $user = User::factory()->create(['google_subject' => 'sub-mark-' . strtolower(str_random(8))]);

        $this->fromPanel()
            ->actingAs($user)
            ->withSession([GoogleSsoService::SESSION_AUTHENTICATED_AT => now()->toIso8601String()])
            ->deleteJson('/api/client/account/sso/google')
            ->assertNoContent()
            ->assertSessionMissing(GoogleSsoService::SESSION_AUTHENTICATED_AT);
    }

    public function testConfirmingWithTheRightPasswordMarksTheSession(): void
    {
        $user = User::factory()->create(['password' => password_hash('correct-horse', PASSWORD_BCRYPT)]);

        $this->fromPanel()
            ->actingAs($user)
            ->postJson('/api/client/account/sso/google', ['password' => 'correct-horse'])
            ->assertNoContent()
            ->assertSessionHas(GoogleSsoService::SESSION_LINK_CONFIRMED_AT);
    }

    public function testConfirmingWithTheWrongPasswordIsRefused(): void
    {
        $user = User::factory()->create(['password' => password_hash('correct-horse', PASSWORD_BCRYPT)]);

        $this->fromPanel()
            ->actingAs($user)
            ->postJson('/api/client/account/sso/google', ['password' => 'wrong'])
            ->assertStatus(400)
            ->assertSessionMissing(GoogleSsoService::SESSION_LINK_CONFIRMED_AT);

        $this->fromPanel()
            ->actingAs($user)
            ->postJson('/api/client/account/sso/google')
            ->assertStatus(400);
    }

    public function testConfirmingWithoutABrowserSessionIsRefused(): void
    {
        $user = User::factory()->create(['password' => password_hash('correct-horse', PASSWORD_BCRYPT)]);

        // No Referer: Sanctum treats the request as a plain API call, without a session.
        $this->actingAs($user)
            ->postJson('/api/client/account/sso/google', ['password' => 'correct-horse'])
            ->assertStatus(400);
    }

    /**
     * Sanctum only starts a session for requests that come from the panel's own
     * frontend, which it recognises by the Referer.
     */
    private function fromPanel(): static
    {
        return $this->withHeader('Referer', config('app.url') . 'account');
    }
}
