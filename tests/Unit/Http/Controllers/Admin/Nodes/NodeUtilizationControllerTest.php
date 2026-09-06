<?php

namespace Pterodactyl\Tests\Unit\Http\Controllers\Admin\Nodes;

use Mockery;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use Pterodactyl\Models\Node;
use Pterodactyl\Tests\TestCase;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\Cache;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\ServerException;
use Pterodactyl\Repositories\Wings\DaemonConfigurationRepository;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;
use Pterodactyl\Http\Controllers\Admin\Nodes\NodeUtilizationController;

class NodeUtilizationControllerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
    }

    public function testUtilizationIsReturnedFromTheDaemon(): void
    {
        $snapshot = [
            'timestamp' => '2026-09-06T21:00:00Z',
            'cpu' => ['threads' => 32, 'percent' => 87.4],
            'pressure' => ['level' => 'warning'],
        ];

        $response = $this->invoke($this->repositoryReturning($snapshot));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame($snapshot, json_decode($response->getContent(), true));
    }

    public function testEmptyResponseIsReportedAsNoContent(): void
    {
        $response = $this->invoke($this->repositoryReturning([]));

        $this->assertSame(204, $response->getStatusCode());
    }

    public function testUnreachableDaemonIsReportedAsBadGateway(): void
    {
        $exception = new DaemonConnectionException(
            new ConnectException('connection refused', new Request('GET', '/api/system/utilization')),
        );

        $response = $this->invoke($this->repositoryThrowing($exception));

        $this->assertSame(502, $response->getStatusCode());
    }

    public function testOutdatedDaemonIsReportedAsNotImplemented(): void
    {
        $exception = new DaemonConnectionException(new ClientException(
            'not found',
            new Request('GET', '/api/system/utilization'),
            new Response(404, [], json_encode(['error' => 'not found'])),
        ));

        $response = $this->invoke($this->repositoryThrowing($exception));

        $this->assertSame(501, $response->getStatusCode());
        $this->assertSame('Wings 1.14.0 or newer is required', json_decode($response->getContent(), true)['error']);
    }

    public function testDisabledMonitorIsPassedThrough(): void
    {
        $exception = new DaemonConnectionException(new ServerException(
            'service unavailable',
            new Request('GET', '/api/system/utilization'),
            new Response(503, [], json_encode(['error' => 'host monitor disabled'])),
        ));

        $response = $this->invoke($this->repositoryThrowing($exception));

        $this->assertSame(503, $response->getStatusCode());
    }

    public function testSubsequentRequestsAreServedFromTheCache(): void
    {
        $repository = Mockery::mock(DaemonConfigurationRepository::class);
        $repository->shouldReceive('setNode')->once()->andReturnSelf();
        $repository->shouldReceive('getSystemUtilization')->once()->andReturn(['cpu' => ['percent' => 1.0]]);

        $node = Node::factory()->make(['id' => 1]);
        $controller = new NodeUtilizationController($repository);

        $controller(HttpRequest::create('/'), $node);
        $second = $controller(HttpRequest::create('/'), $node);

        $this->assertSame(200, $second->getStatusCode());
    }

    private function invoke(DaemonConfigurationRepository $repository)
    {
        $controller = new NodeUtilizationController($repository);

        return $controller(HttpRequest::create('/'), Node::factory()->make(['id' => 1]));
    }

    private function repositoryReturning(array $data): DaemonConfigurationRepository
    {
        $repository = Mockery::mock(DaemonConfigurationRepository::class);
        $repository->shouldReceive('setNode')->once()->andReturnSelf();
        $repository->shouldReceive('getSystemUtilization')->once()->andReturn($data);

        return $repository;
    }

    private function repositoryThrowing(DaemonConnectionException $exception): DaemonConfigurationRepository
    {
        $repository = Mockery::mock(DaemonConfigurationRepository::class);
        $repository->shouldReceive('setNode')->once()->andReturnSelf();
        $repository->shouldReceive('getSystemUtilization')->once()->andThrow($exception);

        return $repository;
    }
}
