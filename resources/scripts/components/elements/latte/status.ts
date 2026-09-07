/**
 * The six tones from section 9.2 of the brand book. Nothing outside this file
 * decides what colour a state gets; screens map their own vocabulary onto one
 * of these and let StatusChip do the rest.
 */
export type StatusTone = 'open' | 'progress' | 'waiting' | 'closed' | 'ok' | 'bad';

export type ServerState =
    | 'running'
    | 'starting'
    | 'stopping'
    | 'offline'
    | 'suspended'
    | 'installing'
    | 'transferring'
    | 'restoring_backup'
    | 'install_failed'
    | 'reinstall_failed'
    | 'node_maintenance';

const serverTones: Record<ServerState, StatusTone> = {
    running: 'ok',
    starting: 'progress',
    stopping: 'progress',
    offline: 'bad',
    suspended: 'bad',
    installing: 'waiting',
    transferring: 'waiting',
    restoring_backup: 'waiting',
    install_failed: 'bad',
    reinstall_failed: 'bad',
    node_maintenance: 'waiting',
};

export const serverTone = (state: string | null | undefined): StatusTone =>
    serverTones[(state ?? 'offline') as ServerState] ?? 'bad';

export type BackupState = 'completed' | 'in_progress' | 'failed' | 'stuck';

const backupTones: Record<BackupState, StatusTone> = {
    completed: 'ok',
    in_progress: 'progress',
    failed: 'bad',
    stuck: 'open',
};

export const backupTone = (state: BackupState): StatusTone => backupTones[state];

export type ScheduleState = 'active' | 'processing' | 'inactive';

const scheduleTones: Record<ScheduleState, StatusTone> = {
    active: 'ok',
    processing: 'progress',
    inactive: 'closed',
};

export const scheduleTone = (state: ScheduleState): StatusTone => scheduleTones[state];

export type SubuserState = 'active' | 'invited';

export const subuserTone = (state: SubuserState): StatusTone => (state === 'active' ? 'ok' : 'waiting');

export type NodeState = 'online' | 'warning' | 'critical' | 'maintenance' | 'offline';

const nodeTones: Record<NodeState, StatusTone> = {
    online: 'ok',
    warning: 'waiting',
    critical: 'bad',
    maintenance: 'waiting',
    offline: 'bad',
};

export const nodeTone = (state: NodeState): StatusTone => nodeTones[state];
