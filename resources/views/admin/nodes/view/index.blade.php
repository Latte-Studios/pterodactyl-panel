@extends('layouts.admin')

@section('title')
    {{ $node->name }}
@endsection

@section('content-header')
    <h1>{{ $node->name }}<small>A quick overview of your node.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.nodes') }}">Nodes</a></li>
        <li class="active">{{ $node->name }}</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="nav-tabs-custom nav-tabs-floating">
            <ul class="nav nav-tabs">
                <li class="active"><a href="{{ route('admin.nodes.view', $node->id) }}">About</a></li>
                <li><a href="{{ route('admin.nodes.view.settings', $node->id) }}">Settings</a></li>
                <li><a href="{{ route('admin.nodes.view.configuration', $node->id) }}">Configuration</a></li>
                <li><a href="{{ route('admin.nodes.view.allocation', $node->id) }}">Allocation</a></li>
                <li><a href="{{ route('admin.nodes.view.servers', $node->id) }}">Servers</a></li>
            </ul>
        </div>
    </div>
</div>
<div class="row">
    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">Host Utilization</h3>
                <span class="pull-right text-muted" data-attr="host-status">Waiting for the first sample&hellip;</span>
            </div>
            <div class="box-body">
                <div class="row">
                    <div class="col-sm-6">
                        <div class="progress-group">
                            <span class="progress-text">CPU</span>
                            <span class="progress-number"><b data-attr="host-cpu-value">--</b></span>
                            <div class="progress sm"><div class="progress-bar progress-bar-green" data-attr="host-cpu-bar" style="width: 0"></div></div>
                        </div>
                        <div class="progress-group">
                            <span class="progress-text">Load <small class="text-muted" data-attr="host-load-detail"></small></span>
                            <span class="progress-number"><b data-attr="host-load-value">--</b></span>
                            <div class="progress sm"><div class="progress-bar progress-bar-aqua" data-attr="host-load-bar" style="width: 0"></div></div>
                        </div>
                        <div class="progress-group">
                            <span class="progress-text">Memory</span>
                            <span class="progress-number"><b data-attr="host-memory-value">--</b></span>
                            <div class="progress sm"><div class="progress-bar progress-bar-green" data-attr="host-memory-bar" style="width: 0"></div></div>
                        </div>
                        <div class="progress-group">
                            <span class="progress-text">Swap</span>
                            <span class="progress-number"><b data-attr="host-swap-value">--</b></span>
                            <div class="progress sm"><div class="progress-bar progress-bar-aqua" data-attr="host-swap-bar" style="width: 0"></div></div>
                        </div>
                        <div data-attr="host-disks"></div>
                    </div>
                    <div class="col-sm-6">
                        <canvas id="host-utilization-chart" height="180"></canvas>
                    </div>
                </div>
            </div>
            <div class="box-footer no-padding">
                <table class="table table-condensed no-margin">
                    <tr>
                        <td style="width: 40%">Containers</td>
                        <td data-attr="host-containers">--</td>
                    </tr>
                    <tr>
                        <td>Memory allocated vs used</td>
                        <td data-attr="host-memory-allocation">--</td>
                    </tr>
                    <tr>
                        <td>CPU allocated vs used</td>
                        <td data-attr="host-cpu-allocation">--</td>
                    </tr>
                </table>
            </div>
        </div>
    </div>
</div>
<div class="row">
    <div class="col-sm-8">
        <div class="row">
            <div class="col-xs-12">
                <div class="box box-primary">
                    <div class="box-header with-border">
                        <h3 class="box-title">Information</h3>
                    </div>
                    <div class="box-body table-responsive no-padding">
                        <table class="table table-hover">
                            <tr>
                                <td>Daemon Version</td>
                                <td><code data-attr="info-version"><i class="fa fa-refresh fa-fw fa-spin"></i></code> (Latest: <code>{{ $version->getDaemon() }}</code>)</td>
                            </tr>
                            <tr>
                                <td>System Information</td>
                                <td data-attr="info-system"><i class="fa fa-refresh fa-fw fa-spin"></i></td>
                            </tr>
                            <tr>
                                <td>Total CPU Threads</td>
                                <td data-attr="info-cpus"><i class="fa fa-refresh fa-fw fa-spin"></i></td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
            @if ($node->description)
                <div class="col-xs-12">
                    <div class="box box-default">
                        <div class="box-header with-border">
                            Description
                        </div>
                        <div class="box-body table-responsive">
                            <pre>{{ $node->description }}</pre>
                        </div>
                    </div>
                </div>
            @endif
            <div class="col-xs-12">
                <div class="box box-danger">
                    <div class="box-header with-border">
                        <h3 class="box-title">Delete Node</h3>
                    </div>
                    <div class="box-body">
                        <p class="no-margin">Deleting a node is a irreversible action and will immediately remove this node from the panel. There must be no servers associated with this node in order to continue.</p>
                    </div>
                    <div class="box-footer">
                        <form action="{{ route('admin.nodes.view.delete', $node->id) }}" method="POST">
                            {!! csrf_field() !!}
                            {!! method_field('DELETE') !!}
                            <button type="submit" class="btn btn-danger btn-sm pull-right" {{ ($node->servers_count < 1) ?: 'disabled' }}>Yes, Delete This Node</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="col-sm-4">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">At-a-Glance</h3>
            </div>
            <div class="box-body">
                <div class="row">
                    @if($node->maintenance_mode)
                    <div class="col-sm-12">
                        <div class="info-box bg-orange">
                            <span class="info-box-icon"><i class="ion ion-wrench"></i></span>
                            <div class="info-box-content" style="padding: 23px 10px 0;">
                                <span class="info-box-text">This node is under</span>
                                <span class="info-box-number">Maintenance</span>
                            </div>
                        </div>
                    </div>
                    @endif
                    <div class="col-sm-12">
                        <div class="info-box bg-{{ $stats['disk']['css'] }}">
                            <span class="info-box-icon"><i class="ion ion-ios-folder-outline"></i></span>
                            <div class="info-box-content" style="padding: 15px 10px 0;">
                                <span class="info-box-text">Disk Space Allocated</span>
                                <span class="info-box-number">{{ $stats['disk']['value'] }} / {{ $stats['disk']['max'] }} MiB</span>
                                <div class="progress">
                                    <div class="progress-bar" style="width: {{ $stats['disk']['percent'] }}%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-sm-12">
                        <div class="info-box bg-{{ $stats['memory']['css'] }}">
                            <span class="info-box-icon"><i class="ion ion-ios-barcode-outline"></i></span>
                            <div class="info-box-content" style="padding: 15px 10px 0;">
                                <span class="info-box-text">Memory Allocated</span>
                                <span class="info-box-number">{{ $stats['memory']['value'] }} / {{ $stats['memory']['max'] }} MiB</span>
                                <div class="progress">
                                    <div class="progress-bar" style="width: {{ $stats['memory']['percent'] }}%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-sm-12">
                        <div class="info-box bg-blue">
                            <span class="info-box-icon"><i class="ion ion-social-buffer-outline"></i></span>
                            <div class="info-box-content" style="padding: 23px 10px 0;">
                                <span class="info-box-text">Total Servers</span>
                                <span class="info-box-number">{{ $node->servers_count }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
    @parent
    {!! Theme::js('vendor/chartjs/chart.min.js?t={cache-version}') !!}
    <script>
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    (function getInformation() {
        $.ajax({
            method: 'GET',
            url: '/admin/nodes/view/{{ $node->id }}/system-information',
            timeout: 5000,
        }).done(function (data) {
            $('[data-attr="info-version"]').html(escapeHtml(data.version));
            $('[data-attr="info-system"]').html(escapeHtml(data.system.type) + ' (' + escapeHtml(data.system.arch) + ') <code>' + escapeHtml(data.system.release) + '</code>');
            $('[data-attr="info-cpus"]').html(data.system.cpus);
        }).fail(function (jqXHR) {

        }).always(function() {
            setTimeout(getInformation, 10000);
        });
    })();

    (function () {
        // Five minutes of history at one sample every three seconds. The points only
        // live in the browser, reloading the page starts the window over.
        var POLL_INTERVAL = 3000;
        var BACKOFF_INTERVAL = 15000;
        var FAILURES_BEFORE_BACKOFF = 3;
        var MAX_POINTS = 100;

        var failures = 0;
        var stopped = false;
        var lastSampleAt = null;

        var BAR_CLASSES = {
            ok: 'progress-bar-green',
            warning: 'progress-bar-yellow',
            critical: 'progress-bar-red',
        };

        function formatBytes(bytes) {
            if (!bytes) {
                return '0 MiB';
            }

            var gib = bytes / 1024 / 1024 / 1024;

            return gib >= 1 ? gib.toFixed(2) + ' GiB' : (bytes / 1024 / 1024).toFixed(0) + ' MiB';
        }

        function formatPercent(value) {
            return (value || 0).toFixed(1) + '%';
        }

        function barClass(level) {
            return BAR_CLASSES[level] || BAR_CLASSES.ok;
        }

        function updateBar(attribute, percent, level) {
            var bar = $('[data-attr="host-' + attribute + '-bar"]');

            $('[data-attr="host-' + attribute + '-value"]').text(formatPercent(percent));
            bar.css('width', Math.max(0, Math.min(100, percent || 0)) + '%');

            if (level) {
                bar.removeClass('progress-bar-green progress-bar-yellow progress-bar-red').addClass(barClass(level));
            }
        }

        function updateDisks(disks, level) {
            var html = '';

            $.each(disks || [], function (i, disk) {
                html += '<div class="progress-group">'
                    + '<span class="progress-text">' + escapeHtml(disk.labels.join(', '))
                    + ' <small class="text-muted">' + escapeHtml(disk.path) + '</small></span>'
                    + '<span class="progress-number"><b>' + formatPercent(disk.percent) + '</b> of '
                    + escapeHtml(formatBytes(disk.total_bytes)) + '</span>'
                    + '<div class="progress sm"><div class="progress-bar ' + barClass(level) + '" style="width: '
                    + Math.max(0, Math.min(100, disk.percent || 0)) + '%"></div></div>'
                    + '</div>';
            });

            $('[data-attr="host-disks"]').html(html);
        }

        // The chart reads the design tokens instead of carrying its own palette,
        // so it follows the light and dark themes like the rest of the panel.
        function token(name) {
            return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        }

        function series(label, color) {
            return { label: label, data: [], borderColor: color, backgroundColor: 'transparent', borderWidth: 2, pointRadius: 0 };
        }

        var chart = new Chart($('#host-utilization-chart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    series('CPU', token('--ls-ok')),
                    series('Memory', token('--ls-progress')),
                    series('Load', token('--ls-waiting')),
                    series('Swap', token('--ls-mocha')),
                ],
            },
            options: {
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
                legend: { position: 'bottom', labels: { fontColor: token('--ls-ink-70'), boxWidth: 12 } },
                scales: {
                    xAxes: [{ display: false }],
                    yAxes: [{
                        ticks: { beginAtZero: true, max: 100, fontColor: token('--ls-ink-50') },
                        gridLines: { color: token('--ls-hairline'), zeroLineColor: token('--ls-border') },
                    }],
                },
            },
        });

        function pushToChart(data) {
            var values = [data.cpu.percent, data.memory.percent, data.cpu.load_percent, data.swap.percent];

            chart.data.labels.push('');
            if (chart.data.labels.length > MAX_POINTS) {
                chart.data.labels.shift();
            }

            $.each(chart.data.datasets, function (i, dataset) {
                dataset.data.push(values[i] || 0);
                if (dataset.data.length > MAX_POINTS) {
                    dataset.data.shift();
                }
            });

            chart.update();
        }

        function render(data) {
            var resources = (data.pressure || {}).resources || {};

            updateBar('cpu', data.cpu.percent, resources.cpu);
            updateBar('load', data.cpu.load_percent, resources.cpu);
            updateBar('memory', data.memory.percent, resources.memory);
            updateBar('swap', data.swap.percent);
            updateDisks(data.disks, resources.disk);

            $('[data-attr="host-load-detail"]').text(
                data.cpu.load['1'].toFixed(2) + ' / ' + data.cpu.load['5'].toFixed(2) + ' / ' + data.cpu.load['15'].toFixed(2)
                + ' on ' + data.cpu.threads + ' threads'
            );
            $('[data-attr="host-containers"]').text(
                data.servers.running + ' running of ' + data.servers.total
                + ' (' + data.servers.unlimited + ' without a limit)'
            );
            $('[data-attr="host-memory-allocation"]').text(
                formatBytes(data.servers.memory_allocated_bytes) + ' allocated, '
                + formatBytes(data.servers.memory_bytes) + ' used by containers, '
                + formatBytes(data.memory.used_bytes) + ' used on the host'
            );
            $('[data-attr="host-cpu-allocation"]').text(
                data.servers.cpu_allocated_percent + '% allocated, '
                + formatPercent(data.servers.cpu_absolute) + ' used by containers, '
                + formatPercent(data.cpu.percent) + ' used on the host'
            );

            pushToChart(data);
        }

        function setStatus(text, css) {
            $('[data-attr="host-status"]').removeClass('text-muted text-red').addClass(css || 'text-muted').text(text);
        }

        function updateAge() {
            if (stopped || lastSampleAt === null) {
                return;
            }

            setStatus('Last sample ' + Math.round((Date.now() - lastSampleAt) / 1000) + 's ago');
        }

        (function getUtilization() {
            $.ajax({
                method: 'GET',
                url: '{{ route('admin.nodes.view.utilization', $node->id) }}',
                timeout: 5000,
            }).done(function (data, status, jqXHR) {
                failures = 0;

                if (jqXHR.status === 204) {
                    setStatus('Waiting for the first sample...');
                    return;
                }

                lastSampleAt = Date.now();
                render(data);
                updateAge();
            }).fail(function (jqXHR) {
                failures++;

                if (jqXHR.status === 501) {
                    // Nothing here is going to change until the node is updated, so
                    // there is no point in asking it for samples again.
                    stopped = true;
                    setStatus('Wings outdated: 1.14.0 or newer required', 'text-red');
                    return;
                }

                setStatus(jqXHR.status === 503 ? 'Host monitor disabled' : 'Wings unreachable', 'text-red');
            }).always(function () {
                if (stopped) {
                    return;
                }

                setTimeout(getUtilization, failures >= FAILURES_BEFORE_BACKOFF ? BACKOFF_INTERVAL : POLL_INTERVAL);
            });
        })();

        setInterval(updateAge, 1000);
    })();
    </script>
@endsection
