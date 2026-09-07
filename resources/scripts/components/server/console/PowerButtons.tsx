import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { ExclamationIcon } from '@heroicons/react/outline';
import Can from '@/components/elements/Can';
import { ServerContext } from '@/state/server';
import { PowerAction } from '@/components/server/console/ServerConsoleContainer';
import Button from '@/components/elements/latte/Button';
import Dialog from '@/components/elements/latte/Dialog';
import styles from './console.module.css';

interface PowerButtonProps {
    className?: string;
}

/** The hazard sign Kill sits behind: a hexagon carrying an exclamation. */
const KillIcon = () => (
    <svg viewBox={'0 0 24 24'} width={20} height={20} aria-hidden fill={'none'} stroke={'currentColor'}>
        <path d={'M12 2.6 20.1 7.3v9.4L12 21.4 3.9 16.7V7.3z'} strokeWidth={1.75} strokeLinejoin={'round'} />
        <path d={'M12 8v4.5'} strokeWidth={1.75} strokeLinecap={'round'} />
        <circle cx={12} cy={15.9} r={0.9} fill={'currentColor'} stroke={'none'} />
    </svg>
);

/**
 * Start is the one contained button on the console. Restart is an outline and
 * Stop is a danger outline. Kill is the hazard sign next to Stop; it opens a
 * confirmation rather than acting, so forcing a process down is never one
 * stray click away from stopping it politely.
 */
export default ({ className }: PowerButtonProps) => {
    const [confirming, setConfirming] = useState(false);

    const status = ServerContext.useStoreState((state) => state.status.value as string | null);
    const instance = ServerContext.useStoreState((state) => state.socket.instance);

    const send = (action: PowerAction) => {
        if (instance) {
            instance.send('set state', action);
        }
    };

    useEffect(() => {
        if (status === 'offline') {
            setConfirming(false);
        }
    }, [status]);

    return (
        <div className={classNames(styles.power, className)}>
            <Dialog
                open={confirming}
                onClose={() => setConfirming(false)}
                title={'Forcibly Stop Process'}
                description={'Forcibly stopping a server can lead to data corruption.'}
                icon={ExclamationIcon}
                danger
                footer={
                    <>
                        <Button variant={'text'} onClick={() => setConfirming(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant={'danger'}
                            onClick={() => {
                                setConfirming(false);
                                send('kill');
                            }}
                        >
                            Continue
                        </Button>
                    </>
                }
            />
            <Can action={'control.start'}>
                <Button variant={'contained'} disabled={status !== 'offline'} onClick={() => send('start')}>
                    Start
                </Button>
            </Can>
            <Can action={'control.restart'}>
                <Button variant={'outline'} disabled={!status} onClick={() => send('restart')}>
                    Restart
                </Button>
            </Can>
            <Can action={'control.stop'}>
                <Button variant={'danger'} disabled={status === 'offline'} onClick={() => send('stop')}>
                    Stop
                </Button>
                <button
                    type={'button'}
                    className={styles.kill}
                    disabled={status === 'offline'}
                    aria-label={'Forcibly stop the process'}
                    title={'Forcibly stop the process'}
                    onClick={() => setConfirming(true)}
                >
                    <KillIcon />
                </button>
            </Can>
        </div>
    );
};
