<?php

namespace Pterodactyl\Tests\Integration\Services\Sso;

use Pterodactyl\Models\User;
use PHPUnit\Framework\Attributes\DataProvider;
use Pterodactyl\Services\Sso\GoogleSsoService;
use Pterodactyl\Tests\Integration\IntegrationTestCase;

class GoogleSsoServiceTest extends IntegrationTestCase
{
    /**
     * The database is shared between tests and runs, so every local part gets
     * a random tag: the derivation must keep it and the rest must be normalised.
     */
    #[DataProvider('usernameProvider')]
    public function testUsernameIsDerivedFromTheLocalPart(string $local, string $expected): void
    {
        $tag = strtolower(str_random(6));

        $this->assertSame(
            $expected . $tag,
            $this->app->make(GoogleSsoService::class)->usernameFor($local . $tag . '@lattestudio.net'),
        );
    }

    public static function usernameProvider(): array
    {
        return [
            ['Fresh.Person', 'fresh.person'],
            ['first_last-x', 'first_last-x'],
            ['weird+tag', 'weird-tag'],
            ['.leading.dot.', 'leading.dot.'],
        ];
    }

    public function testUsernameFallsBackWhenTheLocalPartCannotBeUsed(): void
    {
        $username = $this->app->make(GoogleSsoService::class)->usernameFor('ab@lattestudio.net');

        $this->assertMatchesRegularExpression('/^user-[a-z0-9]{8}$/', $username);
    }

    public function testUsernameCollisionsGetANumericSuffix(): void
    {
        $base = 'sso-' . strtolower(str_random(6));
        User::factory()->create(['username' => $base]);
        User::factory()->create(['username' => $base . '-2']);

        $this->assertSame($base . '-3', $this->app->make(GoogleSsoService::class)->usernameFor($base . '@lattestudio.net'));
    }
}
