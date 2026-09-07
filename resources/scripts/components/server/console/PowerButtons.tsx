import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { ChevronDownIcon, ExclamationIcon } from '@heroicons/react/outline';
import Can from '@/components/elements/Can';
import { ServerContext } from '@/state/server';
import { PowerAction } from '@/components/server/console/ServerConsoleContainer';
import Button from '@/components/elements/latte/Button';
import Dialog from '@/components/elements/latte/Dialog';
import styles from './console.module.css';

interface PowerButtonProps {
    className?: string;
}

/**
 * Start is the one contained button on the console. Restart is an outline,
 * Stop is a danger outline, and Kill sits in a menu under Stop so forcing a
 * process down is never one stray click away from stopping it politely.
 */
export default ({ className }: PowerButtonProps) => {
    const [confirming, setConfirming] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const group = useRef<HTMLDivElement>(null);

    const status = ServerContext.useStoreState(state => state.status.value as string | null);
    const instance = ServerContext.useStoreState(state => state.socket.instance);

    const send = (action: PowerAction) => {
        if (instance) {
            instance.send('set state', action);
        }
    };

    useEffect(() => {
        if (status === 'offline') {
            setConfirming(false);
            setMenuOpen(false);
        }
    }, [status]);

    useEffect(() => {
        if (!menuOpen) {
            return;
        }

        const listener = (event: MouseEvent) => {
            if (group.current && !group.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', listener);

        return () => document.removeEventListener('mousedown', listener);
    }, [menuOpen]);

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
                <div ref={group} className={styles.stopGroup}>
                    <Button variant={'danger'} disabled={status === 'offline'} onClick={() => send('stop')}>
                        Stop
                    </Button>
                    <Button
                        variant={'danger'}
                        iconOnly
                        aria-label={'More power actions'}
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen(open => !open)}
                    >
                        <ChevronDownIcon width={16} height={16} />
                    </Button>
                    {menuOpen && (
                        <div className={styles.stopMenu}>
                            <button
                                type={'button'}
                                className={styles.stopMenuItem}
                                disabled={status === 'offline'}
                                onClick={() => {
                                    setMenuOpen(false);
                                    setConfirming(true);
                                }}
                            >
                                Kill
                            </button>
                        </div>
                    )}
                </div>
            </Can>
        </div>
    );
};
