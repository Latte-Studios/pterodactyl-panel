<?php

namespace Pterodactyl\Http\Controllers\Api\Client;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Services\Sso\GoogleSsoService;

class GoogleSsoController extends ClientApiController
{
    public function __construct(private GoogleSsoService $sso)
    {
        parent::__construct();
    }

    /**
     * Remove the Google account linked to the signed-in user. Linking happens
     * through the browser redirect flow in the auth routes, not through the API.
     *
     * @throws \Throwable
     */
    public function delete(Request $request): JsonResponse
    {
        $this->sso->unlink($request->user());

        return new JsonResponse([], JsonResponse::HTTP_NO_CONTENT);
    }
}
