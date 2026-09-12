<?php

namespace Pterodactyl\Tests\Unit\Services\Sso;

use Pterodactyl\Tests\TestCase;
use Illuminate\Config\Repository;
use PHPUnit\Framework\Attributes\DataProvider;
use Pterodactyl\Services\Sso\GoogleSsoService;
use Pterodactyl\Services\Users\UserCreationService;

class GoogleSsoServiceTest extends TestCase
{
    #[DataProvider('domainProvider')]
    public function testAllowedDomainsAreNormalised(?string $raw, array $expected): void
    {
        $this->assertSame($expected, $this->service(['allowed_domains' => $raw])->allowedDomains());
    }

    public static function domainProvider(): array
    {
        return [
            [null, []],
            ['', []],
            ['lattestudio.net', ['lattestudio.net']],
            [' LatteStudio.NET , other.example,, ', ['lattestudio.net', 'other.example']],
        ];
    }

    #[DataProvider('enabledProvider')]
    public function testEnabledRequiresCredentials(array $config, bool $expected): void
    {
        $this->assertSame($expected, $this->service($config)->isEnabled());
    }

    public static function enabledProvider(): array
    {
        return [
            [['enabled' => true, 'client_id' => 'id', 'client_secret' => 'secret'], true],
            [['enabled' => false, 'client_id' => 'id', 'client_secret' => 'secret'], false],
            [['enabled' => true, 'client_id' => '', 'client_secret' => 'secret'], false],
            [['enabled' => true, 'client_id' => 'id', 'client_secret' => null], false],
        ];
    }

    private function service(array $google): GoogleSsoService
    {
        return new GoogleSsoService(
            new Repository(['services' => ['google' => $google]]),
            \Mockery::mock(UserCreationService::class),
        );
    }
}
