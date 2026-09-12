<div class="box">
    <div class="box-header with-border">
        <h3 class="box-title">Google SSO</h3>
    </div>
    <div class="box-body">
        <div class="row">
            <div class="form-group col-md-4">
                <label class="control-label">Status</label>
                <div>
                    <select class="form-control" name="services:google:enabled">
                        <option value="true" @if(old('services:google:enabled', config('services.google.enabled')) == '1') selected @endif>Enabled</option>
                        <option value="false" @if(old('services:google:enabled', config('services.google.enabled')) != '1') selected @endif>Disabled</option>
                    </select>
                    <p class="text-muted small">Shows a "Continue with Google" button on the login page. Password login keeps working either way.</p>
                </div>
            </div>
            <div class="form-group col-md-4">
                <label class="control-label">Client ID</label>
                <div>
                    <input type="text" class="form-control" name="services:google:client_id" value="{{ old('services:google:client_id', config('services.google.client_id')) }}">
                </div>
            </div>
            <div class="form-group col-md-4">
                <label class="control-label">Client Secret</label>
                <div>
                    <input type="password" class="form-control" name="services:google:client_secret" autocomplete="new-password" placeholder="{{ $googleSecretStored ? 'unchanged' : '' }}">
                    <p class="text-muted small">Leave blank to keep the stored secret. It is encrypted at rest.</p>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="form-group col-md-6">
                <label class="control-label">Allowed Domains</label>
                <div>
                    <input type="text" class="form-control" name="services:google:allowed_domains" value="{{ old('services:google:allowed_domains', config('services.google.allowed_domains')) }}" placeholder="lattestudio.net">
                    <p class="text-muted small">Comma-separated. Only verified Google accounts in these domains may sign in or be linked. An empty list lets nobody in.</p>
                </div>
            </div>
            <div class="form-group col-md-6">
                <label class="control-label">Create Users Automatically</label>
                <div>
                    <select class="form-control" name="services:google:auto_create">
                        <option value="true" @if(old('services:google:auto_create', config('services.google.auto_create')) == '1') selected @endif>Yes</option>
                        <option value="false" @if(old('services:google:auto_create', config('services.google.auto_create')) != '1') selected @endif>No</option>
                    </select>
                    <p class="text-muted small">When a Google account in an allowed domain has no panel account yet, create one as a regular user. Otherwise the sign-in is refused until an administrator creates the account.</p>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-xs-12">
                <div class="alert alert-info no-margin">
                    In Google Cloud, create an OAuth client of type <strong>Web application</strong>, restrict the consent screen to <strong>Internal</strong> (Workspace accounts only) and register this exact redirect URI:
                    <code>{{ $googleCallbackUrl }}</code>.
                    If Google reports <code>redirect_uri_mismatch</code>, check <code>APP_URL</code> and the trusted proxy settings.
                </div>
            </div>
        </div>
    </div>
</div>
