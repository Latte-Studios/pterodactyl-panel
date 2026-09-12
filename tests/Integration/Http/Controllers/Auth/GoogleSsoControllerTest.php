<?php

namespace Pterodactyl\Tests\Integration\Http\Controllers\Auth;

use Illuminate\Support\Str;
use Pterodactyl\Models\User;
use Illuminate\Support\Facades\Event;
use Pterodactyl\Events\ActivityLogged;
use Laravel\Socialite\Facades\Socialite;
use Pterodactyl\Events\Auth\DirectLogin;
use Laravel\Socialite\Two\GoogleProvider;
use Illuminate\Support\Facades\Notification;
use Laravel\Socialite\Two\User as GoogleUser;
use Pterodactyl\Notifications\AccountCreated;
use Pterodactyl\Services\Sso\GoogleSsoService;
use Laravel\Socialite\Two\InvalidStateException;
use Pterodactyl\Tests\Integration\Http\HttpTestCase;

class GoogleSsoControllerTest extends HttpTestCase
{
    private const CALLBACK = '/auth/sso/google/callback';

    /**
     * The integration suite shares one database across tests and runs, so
     * every subject and e-mail carries a per-test random tag.
     */
    private string $tag;

    public function setUp(): void
    {
        parent::setUp();

        $this->tag = strtolower(Str::random(8));

        Event::fake([DirectLogin::class, ActivityLogged::class]);
        Notification::fake();

        config([
            'services.google.enabled' => true,
            'services.google.client_id' => 'client-id',
            'services.google.client_secret' => 'client-secret',
            'services.google.allowed_domains' => 'lattestudio.net',
            'services.google.auto_create' => true,
        ]);
    }

    public function testEndpointsAreHiddenWhenDisabled(): void
    {
        config(['services.google.enabled' => false]);

        $this->get('/auth/sso/google')->assertNotFound();
        $this->get(self::CALLBACK)->assertNotFound();
    }

    public function testRedirectSendsGuestToGoogleWithLoginIntent(): void
    {
        $response = $this->get('/auth/sso/google?redirect=/server/abc');

        $response->assertRedirect();
        $this->assertStringStartsWith('https://accounts.google.com/o/oauth2/auth?', $response->headers->get('Location'));
        $this->assertStringContainsString('hd=lattestudio.net', $response->headers->get('Location'));
        $this->assertStringContainsString('redirect_uri=' . urlencode(url(self::CALLBACK)), $response->headers->get('Location'));
        $response->assertSessionHas('sso.google.intent', 'login');
        $response->assertSessionHas('sso.google.intended', '/server/abc');
    }

    public function testRedirectRejectsOffsiteIntendedUrl(): void
    {
        $this->get('/auth/sso/google?redirect=https://evil.example')
            ->assertSessionMissing('sso.google.intended');
    }

    public function testLinkedUserSignsInBySubject(): void
    {
        $user = User::factory()->create(['google_subject' => $this->sub('1'), 'google_email' => $this->email('old')]);
        $this->fakeGoogle($this->googleUser($this->sub('1'), $this->email('renamed')));

        $this->withSession(['sso.google.intent' => 'login', 'sso.google.intended' => '/server/abc'])
            ->get(self::CALLBACK)
            ->assertRedirect('/server/abc');

        $this->assertAuthenticatedAs($user);
        Event::assertDispatched(fn (DirectLogin $event) => $event->user->is($user));
        $this->assertActivityFor('auth:sso-success', $user, $user);
    }

    public function testSignInLeavesTheSessionMarkedAsGoogleAuthenticated(): void
    {
        User::factory()->create(['google_subject' => $this->sub('1b')]);
        $this->fakeGoogle($this->googleUser($this->sub('1b'), $this->email('marked')));

        $this->withSession(['sso.google.intent' => 'login'])
            ->get(self::CALLBACK)
            ->assertRedirect('/')
            ->assertSessionHas(GoogleSsoService::SESSION_AUTHENTICATED_AT);
    }

    public function testExistingUserIsLinkedByEmailOnFirstSignIn(): void
    {
        $user = User::factory()->create(['email' => $this->email('Someone')]);
        $this->fakeGoogle($this->googleUser($this->sub('2'), $this->email('someone')));

        $this->withSession(['sso.google.intent' => 'login'])->get(self::CALLBACK)->assertRedirect('/');

        $this->assertAuthenticatedAs($user);
        $user->refresh();
        $this->assertSame($this->sub('2'), $user->google_subject);
        $this->assertSame($this->email('someone'), $user->google_email);
        $this->assertNotNull($user->google_linked_at);
    }

    public function testDomainOutsideAllowedListIsRefused(): void
    {
        $this->fakeGoogle($this->googleUser($this->sub('3'), 'someone.' . $this->tag . '@gmail.com'));

        $this->withSession(['sso.google.intent' => 'login'])
            ->get(self::CALLBACK)
            ->assertRedirect('/auth/login?sso_error=domain');

        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['email' => 'someone.' . $this->tag . '@gmail.com']);
    }

    public function testHostedDomainClaimMustMatchAsWell(): void
    {
        $this->fakeGoogle($this->googleUser($this->sub('3b'), $this->email('alias'), ['hd' => 'other.example']));

        $this->withSession(['sso.google.intent' => 'login'])
            ->get(self::CALLBACK)
            ->assertRedirect('/auth/login?sso_error=domain');

        $this->assertGuest();
    }

    public function testAccountWithoutHostedDomainClaimIsRefused(): void
    {
        // A personal Google account registered with an address of the allowed
        // domain: the e-mail checks out, the Workspace claim is missing.
        $this->fakeGoogle($this->googleUser($this->sub('3c'), $this->email('personal'), ['hd' => null]));

        $this->withSession(['sso.google.intent' => 'login'])
            ->get(self::CALLBACK)
            ->assertRedirect('/auth/login?sso_error=domain');

        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['email' => $this->email('personal')]);
    }

    public function testUnverifiedEmailIsRefused(): void
    {
        $this->fakeGoogle($this->googleUser($this->sub('4'), $this->email('unverified'), ['email_verified' => false]));

        $this->withSession(['sso.google.intent' => 'login'])
            ->get(self::CALLBACK)
            ->assertRedirect('/auth/login?sso_error=unverified');

        $this->assertGuest();
    }

    public function testUnknownAccountIsRefusedWhenAutoCreateIsOff(): void
    {
        config(['services.google.auto_create' => false]);
        $this->fakeGoogle($this->googleUser($this->sub('5'), $this->email('newcomer')));

        $this->withSession(['sso.google.intent' => 'login'])
            ->get(self::CALLBACK)
            ->assertRedirect('/auth/login?sso_error=no-account');

        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['email' => $this->email('newcomer')]);
    }

    public function testUnknownAccountIsCreatedWhenAutoCreateIsOn(): void
    {
        $this->fakeGoogle($this->googleUser($this->sub('6'), $this->email('Fresh.Person'), [
            'given_name' => 'Fresh',
            'family_name' => 'Person',
        ]));

        $this->withSession(['sso.google.intent' => 'login'])->get(self::CALLBACK)->assertRedirect('/');

        /** @var User $user */
        $user = User::query()->where('email', $this->email('fresh.person'))->firstOrFail();
        $this->assertAuthenticatedAs($user);
        $this->assertFalse($user->root_admin);
        $this->assertSame('fresh.person.' . $this->tag, $user->username);
        $this->assertSame('Fresh', $user->name_first);
        $this->assertSame('Person', $user->name_last);
        $this->assertSame($this->sub('6'), $user->google_subject);

        Notification::assertSentTo($user, AccountCreated::class);
    }

    public function testUserWithTotpSignsInWithoutCheckpoint(): void
    {
        $user = User::factory()->create([
            'email' => $this->email('totp'),
            'google_subject' => $this->sub('7'),
            'use_totp' => true,
            'totp_secret' => encrypt(str_repeat('a', 16)),
        ]);
        $this->fakeGoogle($this->googleUser($this->sub('7'), $user->email));

        $this->withSession(['sso.google.intent' => 'login'])->get(self::CALLBACK)->assertRedirect('/');

        $this->assertAuthenticatedAs($user);
    }

    public function testInvalidStateIsReportedAsExpiredSession(): void
    {
        $provider = \Mockery::mock(GoogleProvider::class);
        $provider->shouldReceive('user')->once()->andThrow(new InvalidStateException());
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $this->withSession(['sso.google.intent' => 'login'])
            ->get(self::CALLBACK)
            ->assertRedirect('/auth/login?sso_error=state');

        $this->assertGuest();
    }

    public function testCancelledConsentGoesQuietlyBackToLogin(): void
    {
        $this->withSession(['sso.google.intent' => 'login'])
            ->get(self::CALLBACK . '?error=access_denied')
            ->assertRedirect('/auth/login');

        $this->assertGuest();
    }

    public function testSignedInUserCanLinkTheirGoogleAccount(): void
    {
        $user = User::factory()->create();
        $this->fakeGoogle($this->googleUser($this->sub('8'), $this->email('link-me')));

        $this->actingAs($user)
            ->withSession(['sso.google.intent' => 'link'])
            ->get(self::CALLBACK)
            ->assertRedirect('/account?sso_linked=1');

        $user->refresh();
        $this->assertSame($this->sub('8'), $user->google_subject);
        $this->assertSame($this->email('link-me'), $user->google_email);
        $this->assertActivityFor('user:account.sso-linked', $user, $user);
    }

    public function testGoogleAccountLinkedElsewhereCannotBeLinkedAgain(): void
    {
        User::factory()->create(['google_subject' => $this->sub('9')]);
        $user = User::factory()->create();
        $this->fakeGoogle($this->googleUser($this->sub('9'), $this->email('taken')));

        $this->actingAs($user)
            ->withSession(['sso.google.intent' => 'link'])
            ->get(self::CALLBACK)
            ->assertRedirect('/account?sso_error=already-linked');

        $this->assertNull($user->refresh()->google_subject);
    }

    public function testRedirectRecordsLinkIntentAfterAFreshPasswordConfirmation(): void
    {
        $this->actingAs(User::factory()->create())
            ->withSession([GoogleSsoService::SESSION_LINK_CONFIRMED_AT => now()->toIso8601String()])
            ->get('/auth/sso/google')
            ->assertRedirect()
            ->assertSessionHas('sso.google.intent', 'link')
            // The confirmation is good for one round trip only.
            ->assertSessionMissing(GoogleSsoService::SESSION_LINK_CONFIRMED_AT);
    }

    public function testRedirectRefusesToLinkWithoutAPasswordConfirmation(): void
    {
        $this->actingAs(User::factory()->create())
            ->get('/auth/sso/google')
            ->assertRedirect('/account?sso_error=confirm')
            ->assertSessionMissing('sso.google.intent');
    }

    public function testRedirectRefusesToLinkWithAStalePasswordConfirmation(): void
    {
        $stale = now()->subSeconds(GoogleSsoService::LINK_CONFIRMATION_TTL_SECONDS + 1)->toIso8601String();

        $this->actingAs(User::factory()->create())
            ->withSession([GoogleSsoService::SESSION_LINK_CONFIRMED_AT => $stale])
            ->get('/auth/sso/google')
            ->assertRedirect('/account?sso_error=confirm')
            ->assertSessionMissing(GoogleSsoService::SESSION_LINK_CONFIRMED_AT);
    }

    public function testRedirectRecordsReauthIntentForLinkedUser(): void
    {
        $user = User::factory()->create(['google_subject' => $this->sub('10'), 'google_email' => $this->email('linked')]);

        $response = $this->actingAs($user)->get('/auth/sso/google?redirect=/admin');

        $response->assertRedirect()->assertSessionHas('sso.google.intent', 'reauth');
        $response->assertSessionHas('sso.google.intended', '/admin');
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('login_hint=' . urlencode($this->email('linked')), $location);
        $this->assertStringNotContainsString('select_account', $location);
    }

    public function testReauthMarksTheSessionWhenTheSubjectMatches(): void
    {
        $user = User::factory()->create(['google_subject' => $this->sub('11'), 'google_email' => $this->email('again')]);
        $this->fakeGoogle($this->googleUser($this->sub('11'), $this->email('again')));

        $this->actingAs($user)
            ->withSession(['sso.google.intent' => 'reauth', 'sso.google.intended' => '/admin'])
            ->get(self::CALLBACK)
            ->assertRedirect('/admin')
            ->assertSessionHas(GoogleSsoService::SESSION_AUTHENTICATED_AT);

        $this->assertAuthenticatedAs($user);
        Event::assertNotDispatched(DirectLogin::class);
        $this->assertActivityFor('auth:sso-success', $user, $user);
    }

    public function testReauthRefusesAnotherGoogleAccount(): void
    {
        $user = User::factory()->create(['google_subject' => $this->sub('12'), 'google_email' => $this->email('mine')]);
        $this->fakeGoogle($this->googleUser($this->sub('12-other'), $this->email('mine')));

        $this->actingAs($user)
            ->withSession(['sso.google.intent' => 'reauth'])
            ->get(self::CALLBACK)
            ->assertRedirect('/account?sso_error=mismatch')
            ->assertSessionMissing(GoogleSsoService::SESSION_AUTHENTICATED_AT);

        $this->assertSame($this->sub('12'), $user->refresh()->google_subject);
    }

    private function sub(string $name): string
    {
        return 'sub-' . $name . '-' . $this->tag;
    }

    private function email(string $local): string
    {
        return $local . '.' . $this->tag . '@lattestudio.net';
    }

    private function fakeGoogle(GoogleUser $google): void
    {
        $provider = \Mockery::mock(GoogleProvider::class);
        $provider->shouldReceive('user')->once()->andReturn($google);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    private function googleUser(string $subject, string $email, array $raw = []): GoogleUser
    {
        $raw = array_merge([
            'sub' => $subject,
            'email' => $email,
            'email_verified' => true,
            'hd' => mb_strtolower(substr($email, strpos($email, '@') + 1)),
            'name' => 'Test Person',
            'given_name' => 'Test',
            'family_name' => 'Person',
        ], $raw);

        return (new GoogleUser())->setRaw($raw)->map([
            'id' => $raw['sub'],
            'nickname' => null,
            'name' => $raw['name'],
            'email' => $raw['email'],
            'avatar' => null,
        ]);
    }
}
