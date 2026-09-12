<?php

namespace Pterodactyl\Http\Controllers\Api\Client;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Services\Sso\GoogleSsoService;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class GoogleSsoController extends ClientApiController
{
    public function __construct(private GoogleSsoService $sso)
    {
        parent::__construct();
    }

    /**
     * Confirm the password of the signed-in user so that the browser may start
     * linking a Google account. Linking itself happens through the redirect
     * flow in the auth routes, which refuses to start without this step.
     */
    public function store(Request $request): JsonResponse
    {
        // The confirmation lives in the browser session that will follow the
        // redirect; an API key has neither.
        if (!$request->hasSession()) {
            throw new BadRequestHttpException('A Google account can only be linked from the panel.');
        }

        if (!password_verify($request->input('password') ?? '', $request->user()->password)) {
            throw new BadRequestHttpException('The password provided was not valid.');
        }

        $this->sso->confirmLink($request);

        return new JsonResponse([], JsonResponse::HTTP_NO_CONTENT);
    }

    /**
     * Remove the Google account linked to the signed-in user.
     *
     * @throws \Throwable
     */
    public function delete(Request $request): JsonResponse
    {
        $this->sso->unlink($request->user());
        $this->sso->forgetSessionAuthenticated($request);

        return new JsonResponse([], JsonResponse::HTTP_NO_CONTENT);
    }
}
