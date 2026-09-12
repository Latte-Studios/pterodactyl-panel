<?php

namespace Pterodactyl\Tests\Integration\Http\Middleware;

use Pterodactyl\Models\User;
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

    public function testUserLinkedToGoogleCountsAsHavingASecondFactor(): void
    {
        $this->actingAs(User::factory()->create(['google_subject' => 'sub-2fa-' . strtolower(str_random(8))]))
            ->withHeaders(['Accept' => 'text/html'])
            ->get('/')
            ->assertOk();
    }
}
