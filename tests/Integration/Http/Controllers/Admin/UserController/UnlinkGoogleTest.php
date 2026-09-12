<?php

namespace Pterodactyl\Tests\Integration\Http\Controllers\Admin\UserController;

use Pterodactyl\Models\User;
use Pterodactyl\Tests\Integration\Http\HttpTestCase;

class UnlinkGoogleTest extends HttpTestCase
{
    public function testNonAdminCannotUnlink(): void
    {
        $linked = $this->linkedUser();

        $this->actingAs(User::factory()->create())
            ->delete('/admin/users/view/' . $linked->id . '/sso/google')
            ->assertForbidden();

        $this->assertNotNull($linked->refresh()->google_subject);
    }

    public function testAdminCanUnlinkAGoogleAccount(): void
    {
        $admin = User::factory()->admin()->create();
        $linked = $this->linkedUser();

        $this->actingAs($admin)
            ->delete('/admin/users/view/' . $linked->id . '/sso/google')
            ->assertRedirect('/admin/users/view/' . $linked->id);

        $linked->refresh();
        $this->assertNull($linked->google_subject);
        $this->assertNull($linked->google_email);
        $this->assertNull($linked->google_linked_at);

        $this->assertActivityFor('user:account.sso-unlinked', $admin, $linked);
    }

    private function linkedUser(): User
    {
        $tag = strtolower(str_random(8));

        return User::factory()->create([
            'google_subject' => 'sub-admin-' . $tag,
            'google_email' => 'admin.' . $tag . '@lattestudio.net',
            'google_linked_at' => now(),
        ]);
    }
}
