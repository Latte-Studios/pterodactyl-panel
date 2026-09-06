<?php

namespace Pterodactyl\Tests\Unit\Services\Servers;

use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Pterodactyl\Tests\TestCase;
use Pterodactyl\Services\Servers\GetUserPermissionsService;

class GetUserPermissionsServiceTest extends TestCase
{
    public function testRootAdminsReceiveTheHostPermission(): void
    {
        $user = User::factory()->make(['id' => 1, 'root_admin' => true]);
        $server = Server::factory()->make(['owner_id' => 2]);

        $permissions = (new GetUserPermissionsService())->handle($server, $user);

        $this->assertContains('admin.websocket.host', $permissions);
    }

    public function testServerOwnersDoNotReceiveTheHostPermission(): void
    {
        $user = User::factory()->make(['id' => 1, 'root_admin' => false]);
        $server = Server::factory()->make(['owner_id' => 1]);

        $permissions = (new GetUserPermissionsService())->handle($server, $user);

        $this->assertSame(['*'], $permissions);
        $this->assertNotContains('admin.websocket.host', $permissions);
    }
}
