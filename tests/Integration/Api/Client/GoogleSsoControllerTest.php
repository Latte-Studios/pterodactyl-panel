<?php

namespace Pterodactyl\Tests\Integration\Api\Client;

use Pterodactyl\Models\User;

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
}
