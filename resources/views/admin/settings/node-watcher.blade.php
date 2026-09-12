@extends('layouts.admin')
@include('partials/admin.settings.nav', ['activeTab' => 'node-watcher'])

@section('title')
    Node Watcher Settings
@endsection

@section('content-header')
    <h1>Node Watcher<small>Send the state of your nodes to webhooks.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">Settings</li>
    </ol>
@endsection

@section('content')
    @yield('settings::nav')
    @if($secret = session(\Pterodactyl\Http\Controllers\Admin\Settings\NodeWatcherController::SECRET_FLASH_KEY))
        <div class="row">
            <div class="col-xs-12">
                <div class="alert alert-success">
                    <strong>Secret for "{{ $secret['name'] }}":</strong>
                    <code id="pNewSecret" style="user-select: all;">{{ $secret['secret'] }}</code>
                    <p class="no-margin">Copy it now. It is used to sign every delivery with HMAC-SHA256 and will not be shown again. Discord and Slack ignore the signature, so it can be discarded for them.</p>
                </div>
            </div>
        </div>
    @endif
    <div class="row">
        <div class="col-xs-12">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">Heartbeat</h3>
                </div>
                <form action="{{ route('admin.settings.node-watcher') }}" method="POST">
                    <div class="box-body">
                        <div class="row">
                            <div class="form-group col-md-4">
                                <label class="control-label">Interval</label>
                                <div>
                                    <select class="form-control" name="pterodactyl:node_watcher:heartbeat_interval">
                                        @foreach([0 => 'Off', 1 => 'Every minute', 5 => 'Every 5 minutes', 15 => 'Every 15 minutes', 30 => 'Every 30 minutes', 60 => 'Every hour'] as $value => $label)
                                            <option value="{{ $value }}" @if((int) old('pterodactyl:node_watcher:heartbeat_interval', $heartbeatInterval) === $value) selected @endif>{{ $label }}</option>
                                        @endforeach
                                    </select>
                                    <p class="text-muted small">How often the Panel collects the utilization of every node for the <code>host.heartbeat</code> event. A node that fails three collections in a row triggers <code>node.unreachable</code>. Requires the Panel cron to be running.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="box-footer">
                        {!! csrf_field() !!}
                        <button type="submit" name="_method" value="PATCH" class="btn btn-sm btn-primary pull-right">Save</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    <div class="row">
        <div class="col-xs-12">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">Webhooks</h3>
                    <div class="box-tools">
                        <button type="button" class="btn btn-sm btn-primary" id="pAddWebhook">Add Webhook</button>
                    </div>
                </div>
                <div class="box-body table-responsive no-padding">
                    <table class="table table-hover">
                        <tr>
                            <th>Name</th>
                            <th>URL</th>
                            <th>Events</th>
                            <th>Nodes</th>
                            <th>Last Delivery</th>
                            <th></th>
                        </tr>
                        @forelse($webhooks as $webhook)
                            <tr>
                                <td data-label="Name">
                                    {{ $webhook->name }}
                                    @if(!$webhook->enabled)
                                        <span class="label label-default">Paused</span>
                                    @endif
                                    @if($webhook->body_template)
                                        <span class="label label-info" title="Uses a custom body">Custom body</span>
                                    @endif
                                </td>
                                <td data-label="URL"><code title="{{ $webhook->url }}">{{ \Illuminate\Support\Str::limit($webhook->url, 48) }}</code></td>
                                <td data-label="Events">
                                    @foreach($webhook->events as $event)
                                        <span class="label label-default">{{ $event }}</span>
                                    @endforeach
                                </td>
                                <td data-label="Nodes">
                                    @if(empty($webhook->node_ids))
                                        All nodes
                                    @else
                                        {{ $nodes->whereIn('id', $webhook->node_ids)->pluck('name')->join(', ') }}
                                    @endif
                                </td>
                                <td data-label="Last Delivery">
                                    @if(is_null($webhook->last_delivery_at))
                                        <span class="text-muted">Never</span>
                                    @elseif($webhook->last_status >= 200 && $webhook->last_status < 300)
                                        <span class="label label-success">{{ $webhook->last_status }}</span>
                                        {{ $webhook->last_delivery_at->diffForHumans() }}
                                    @else
                                        <span class="label label-danger" title="{{ $webhook->last_error }}">{{ $webhook->last_status ?: 'Failed' }}</span>
                                        {{ $webhook->last_delivery_at->diffForHumans() }}
                                    @endif
                                </td>
                                <td class="text-right" data-label="Actions">
                                    <button type="button" class="btn btn-xs btn-default pEditWebhook" data-webhook="{{ json_encode([
                                        'uuid' => $webhook->uuid,
                                        'name' => $webhook->name,
                                        'url' => $webhook->url,
                                        'events' => $webhook->events,
                                        'node_ids' => $webhook->node_ids ?? [],
                                        'body_template' => $webhook->body_template ?? '',
                                        'enabled' => $webhook->enabled,
                                    ]) }}">Edit</button>
                                    <button type="button" class="btn btn-xs btn-default pTestWebhook" data-uuid="{{ $webhook->uuid }}" data-name="{{ $webhook->name }}">Test</button>
                                    <button type="button" class="btn btn-xs btn-default pRotateWebhook" data-uuid="{{ $webhook->uuid }}" data-name="{{ $webhook->name }}">Rotate Secret</button>
                                    <button type="button" class="btn btn-xs btn-danger pDeleteWebhook" data-uuid="{{ $webhook->uuid }}" data-name="{{ $webhook->name }}">Delete</button>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="6" class="text-center text-muted">No webhooks registered.</td>
                            </tr>
                        @endforelse
                    </table>
                </div>
            </div>
        </div>
    </div>

    <form id="pWebhookActionForm" method="POST" action="">
        {!! csrf_field() !!}
        <input type="hidden" name="_method" value="POST" id="pWebhookActionMethod" />
    </form>

    <div class="modal fade" id="pWebhookModal" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-lg" role="document">
            <form id="pWebhookForm" method="POST" action="{{ route('admin.settings.node-watcher.webhooks') }}">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                        <h4 class="modal-title" id="pWebhookModalTitle">Add Webhook</h4>
                    </div>
                    <div class="modal-body">
                        {!! csrf_field() !!}
                        <input type="hidden" name="_method" value="POST" id="pWebhookFormMethod" />
                        <input type="hidden" name="_form" value="webhook" />
                        <input type="hidden" name="_webhook" value="{{ old('_webhook', '') }}" id="pWebhookUuid" />
                        <div class="row">
                            <div class="form-group col-md-4">
                                <label class="control-label">Name</label>
                                <input type="text" class="form-control" name="name" id="pWebhookName" value="{{ old('name') }}" maxlength="100" />
                            </div>
                            <div class="form-group col-md-8">
                                <label class="control-label">URL</label>
                                <input type="url" class="form-control" name="url" id="pWebhookUrl" value="{{ old('url') }}" placeholder="https://" />
                            </div>
                        </div>
                        <div class="row">
                            <div class="form-group col-md-6">
                                <label class="control-label">Events</label>
                                @foreach(\Pterodactyl\Models\NodeWatcherWebhook::EVENT_DESCRIPTIONS as $event => $description)
                                    <div class="checkbox checkbox-primary no-margin-bottom">
                                        <input type="checkbox" id="pWebhookEvent-{{ $loop->index }}" name="events[]" value="{{ $event }}" class="pWebhookEvent" @if(in_array($event, old('events', []))) checked @endif />
                                        <label for="pWebhookEvent-{{ $loop->index }}"><code>{{ $event }}</code></label>
                                        <p class="text-muted small no-margin">{{ $description }}</p>
                                    </div>
                                @endforeach
                            </div>
                            <div class="form-group col-md-6">
                                <label class="control-label">Nodes</label>
                                <select class="form-control" name="node_ids[]" id="pWebhookNodes" multiple>
                                    @foreach($nodes as $node)
                                        <option value="{{ $node->id }}" @if(in_array($node->id, old('node_ids', []))) selected @endif>{{ $node->name }}</option>
                                    @endforeach
                                </select>
                                <p class="text-muted small">Leave empty to watch every node.</p>
                                <div class="checkbox checkbox-primary">
                                    <input type="checkbox" name="enabled" value="1" id="pWebhookEnabled" @if(old('enabled', '1')) checked @endif />
                                    <label for="pWebhookEnabled" class="strong">Enabled</label>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-xs-12">
                                <a href="#pWebhookTemplate" data-toggle="collapse" id="pWebhookTemplateToggle">Customize body <i class="fa fa-caret-down"></i></a>
                                <div class="collapse @if(old('body_template') || $errors->has('body_template')) in @endif" id="pWebhookTemplate">
                                    <div class="row" style="margin-top: 12px;">
                                        <div class="form-group col-md-8">
                                            <label class="control-label">Body template</label>
                                            <div class="input-group input-group-sm" style="margin-bottom: 6px;">
                                                <select class="form-control" id="pWebhookExample">
                                                    <option value="">Insert example...</option>
                                                    @foreach($examples as $key => $example)
                                                        <option value="{{ $key }}">{{ $example['label'] }}</option>
                                                    @endforeach
                                                </select>
                                                <span class="input-group-btn">
                                                    <button type="button" class="btn btn-default" id="pWebhookPreview">Preview</button>
                                                </span>
                                            </div>
                                            <textarea class="form-control" name="body_template" id="pWebhookBody" rows="18" spellcheck="false" style="font-family: monospace; resize: vertical;">{{ old('body_template') }}</textarea>
                                            @if($errors->has('body_template'))
                                                <p class="text-danger small">{{ $errors->first('body_template') }}</p>
                                            @endif
                                            <p class="text-muted small">Leave empty to send the default JSON payload. Discord and Slack reject it and require a template. The rendered body must be valid JSON.</p>
                                            <p class="text-info small hidden" id="pWebhookTemplateNotice"></p>
                                            <pre id="pWebhookPreviewOutput" class="hidden" style="max-height: 320px; overflow: auto;"></pre>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="control-label">Placeholders</label>
                                            <table class="table table-condensed no-margin">
                                                <tr><td><code>@{{event}}</code></td><td>Event name</td></tr>
                                                <tr><td><code>@{{node.name}}</code></td><td>Node name</td></tr>
                                                <tr><td><code>@{{node.fqdn}}</code></td><td>Node FQDN</td></tr>
                                                <tr><td><code>@{{node.id}}</code></td><td>Node ID</td></tr>
                                                <tr><td><code>@{{data.previous}}</code></td><td>Previous level</td></tr>
                                                <tr><td><code>@{{data.current}}</code></td><td>Current level</td></tr>
                                                <tr><td><code>@{{percent data.snapshot.cpu.percent}}</code></td><td>CPU %</td></tr>
                                                <tr><td><code>@{{percent data.snapshot.memory.percent}}</code></td><td>Memory %</td></tr>
                                                <tr><td><code>@{{json data.snapshot.disks}}</code></td><td>Disks as JSON</td></tr>
                                                <tr><td><code>@{{json data.snapshot}}</code></td><td>Whole snapshot</td></tr>
                                                <tr><td><code>@{{sent_at}}</code></td><td>Timestamp</td></tr>
                                                <tr><td><code>@{{panel.url}}</code></td><td>Panel URL</td></tr>
                                                <tr><td><code>@{{json .}}</code></td><td>Default payload</td></tr>
                                                <tr><td><code>@{{data.current|n/a}}</code></td><td>Text when missing</td></tr>
                                            </table>
                                            <p class="text-muted small" style="margin-top: 6px;"><code>@{{path}}</code> is escaped for use inside a JSON string, <code>@{{json path}}</code> inserts raw JSON and <code>@{{percent path}}</code> formats a number with one decimal.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary" id="pWebhookSubmit">Save</button>
                    </div>
                </div>
            </form>
        </div>
    </div>
@endsection

@section('footer-scripts')
    @parent
    <script>
        (function () {
            var examples = @json(collect($examples)->map(fn ($example) => $example['body']));
            var labels = @json(collect($examples)->map(fn ($example) => $example['label']));
            var requiredHosts = @json($requiredHosts);
            var routes = {
                store: '{{ route('admin.settings.node-watcher.webhooks') }}',
                webhook: '{{ route('admin.settings.node-watcher.webhooks.update', ['webhook' => '__UUID__']) }}',
                rotate: '{{ route('admin.settings.node-watcher.webhooks.rotate', ['webhook' => '__UUID__']) }}',
                test: '{{ route('admin.settings.node-watcher.webhooks.test', ['webhook' => '__UUID__']) }}',
                preview: '{{ route('admin.settings.node-watcher.preview') }}'
            };
            var csrf = $('#pWebhookForm input[name="_token"]').val();

            function url(name, uuid) {
                return routes[name].replace('__UUID__', uuid);
            }

            $('#pWebhookNodes').select2({ placeholder: 'All nodes', width: '100%' });

            function openModal(webhook) {
                var editing = !!webhook;
                $('#pWebhookModalTitle').text(editing ? 'Edit Webhook' : 'Add Webhook');
                $('#pWebhookForm').attr('action', editing ? url('webhook', webhook.uuid) : routes.store);
                $('#pWebhookFormMethod').val(editing ? 'PATCH' : 'POST');
                $('#pWebhookUuid').val(editing ? webhook.uuid : '');
                $('#pWebhookName').val(editing ? webhook.name : '');
                $('#pWebhookUrl').val(editing ? webhook.url : '');
                $('.pWebhookEvent').each(function () {
                    $(this).prop('checked', editing ? webhook.events.indexOf($(this).val()) !== -1 : $(this).val() === 'host.pressure');
                });
                $('#pWebhookNodes').val(editing ? webhook.node_ids.map(String) : []).trigger('change');
                $('#pWebhookEnabled').prop('checked', editing ? webhook.enabled : true);
                $('#pWebhookBody').val(editing ? webhook.body_template : '');
                $('#pWebhookPreviewOutput').addClass('hidden').text('');
                $('#pWebhookTemplateNotice').addClass('hidden').text('');
                $('#pWebhookTemplate').collapse(editing && webhook.body_template ? 'show' : 'hide');
                $('#pWebhookModal').modal('show');
                insertRequiredExample();
            }

            // Returns the example a URL requires, or null. Mirrors TemplateExamples::forUrl().
            function requiredExample(value) {
                var host;
                try {
                    host = new URL(value).hostname.toLowerCase();
                } catch (e) {
                    return null;
                }
                for (var key in requiredHosts) {
                    for (var i = 0; i < requiredHosts[key].length; i++) {
                        var candidate = requiredHosts[key][i];
                        if (host === candidate || host.endsWith('.' + candidate)) {
                            return key;
                        }
                    }
                }
                return null;
            }

            // Fills in the example a receiver needs when the body is still empty,
            // so that the default payload is never sent to a service that rejects it.
            function insertRequiredExample() {
                var key = requiredExample($('#pWebhookUrl').val());
                if (!key || $.trim($('#pWebhookBody').val()) !== '') {
                    return;
                }
                $('#pWebhookBody').val(examples[key]);
                $('#pWebhookTemplate').collapse('show');
                $('#pWebhookTemplateNotice').removeClass('hidden')
                    .text(labels[key] + ' rejects the default body, so the ' + labels[key] + ' example was inserted. Edit it as you like.');
            }

            $('#pWebhookUrl').on('change', insertRequiredExample);

            $('#pAddWebhook').on('click', function () {
                openModal(null);
            });

            $('.pEditWebhook').on('click', function () {
                openModal($(this).data('webhook'));
            });

            $('#pWebhookExample').on('change', function () {
                var key = $(this).val();
                if (key && examples[key]) {
                    $('#pWebhookBody').val(examples[key]);
                }
                $(this).val('');
            });

            $('#pWebhookBody').on('keydown', function (event) {
                if (event.key !== 'Tab') {
                    return;
                }
                event.preventDefault();
                var start = this.selectionStart;
                var end = this.selectionEnd;
                this.value = this.value.substring(0, start) + '  ' + this.value.substring(end);
                this.selectionStart = this.selectionEnd = start + 2;
            });

            $('#pWebhookPreview').on('click', function () {
                var output = $('#pWebhookPreviewOutput');
                $.ajax({
                    method: 'POST',
                    url: routes.preview,
                    contentType: 'application/json',
                    data: JSON.stringify({ body_template: $('#pWebhookBody').val() }),
                    headers: { 'X-CSRF-Token': csrf }
                }).done(function (data) {
                    output.removeClass('hidden').toggleClass('text-danger', !data.valid)
                        .text(data.valid ? data.body : data.error + '\n\n' + data.body);
                }).fail(function (jqXHR) {
                    output.removeClass('hidden').addClass('text-danger').text(errorText(jqXHR));
                });
            });

            $('.pTestWebhook').on('click', function () {
                var uuid = $(this).data('uuid');
                var name = $(this).data('name');
                swal({
                    type: 'info',
                    title: 'Test Webhook',
                    text: 'A "ping" event will be delivered to "' + name + '" right now.',
                    showCancelButton: true,
                    confirmButtonText: 'Send',
                    closeOnConfirm: false,
                    showLoaderOnConfirm: true
                }, function () {
                    $.ajax({
                        method: 'POST',
                        url: url('test', uuid),
                        headers: { 'X-CSRF-Token': csrf }
                    }).done(function (data) {
                        if (data.ok) {
                            swal({
                                type: 'success',
                                title: 'Delivered',
                                text: 'The receiver answered HTTP ' + data.status + ' in ' + data.duration_ms + ' ms.'
                            }, function () { window.location.reload(); });
                            return;
                        }
                        swal({
                            type: 'error',
                            title: 'Delivery failed',
                            text: data.error || 'The receiver did not accept the delivery.'
                        }, function () { window.location.reload(); });
                    }).fail(function (jqXHR) {
                        swal({
                            type: 'error',
                            title: 'Delivery failed',
                            text: errorText(jqXHR)
                        }, function () { window.location.reload(); });
                    });
                });
            });

            $('.pRotateWebhook').on('click', function () {
                var uuid = $(this).data('uuid');
                swal({
                    type: 'warning',
                    title: 'Rotate Secret',
                    text: 'Deliveries to "' + $(this).data('name') + '" will be signed with a new secret. The receiver must be updated.',
                    showCancelButton: true,
                    confirmButtonText: 'Rotate',
                    closeOnConfirm: true
                }, function () {
                    submitAction(url('rotate', uuid), 'POST');
                });
            });

            $('.pDeleteWebhook').on('click', function () {
                var uuid = $(this).data('uuid');
                swal({
                    type: 'error',
                    title: 'Delete Webhook',
                    text: 'The webhook "' + $(this).data('name') + '" will be deleted and no further deliveries will be made.',
                    showCancelButton: true,
                    confirmButtonText: 'Delete',
                    confirmButtonColor: '#d9534f',
                    closeOnConfirm: true
                }, function () {
                    submitAction(url('webhook', uuid), 'DELETE');
                });
            });

            function submitAction(action, method) {
                $('#pWebhookActionForm').attr('action', action);
                $('#pWebhookActionMethod').val(method);
                $('#pWebhookActionForm').submit();
            }

            function errorText(jqXHR) {
                if (!jqXHR.responseJSON) {
                    return jqXHR.responseText || 'An unexpected error occurred.';
                }
                if (jqXHR.responseJSON.error) {
                    return jqXHR.responseJSON.error;
                }
                if (jqXHR.responseJSON.errors) {
                    return $.map(jqXHR.responseJSON.errors, function (error) { return error.detail; }).join(' ');
                }
                return jqXHR.responseJSON.message || 'An unexpected error occurred.';
            }

            @if($errors->any() && old('_form') === 'webhook')
                // The page came back from a failed submission: reopen the modal with
                // the old values Blade already put into the fields.
                $('#pWebhookForm').attr('action', $('#pWebhookUuid').val() ? url('webhook', $('#pWebhookUuid').val()) : routes.store);
                $('#pWebhookFormMethod').val($('#pWebhookUuid').val() ? 'PATCH' : 'POST');
                $('#pWebhookModalTitle').text($('#pWebhookUuid').val() ? 'Edit Webhook' : 'Add Webhook');
                $('#pWebhookModal').modal('show');
            @endif
        })();
    </script>
@endsection
