import React, { memo } from 'react';
import { ExclamationIcon } from '@heroicons/react/outline';
import { ServerContext } from '@/state/server';
import Can from '@/components/elements/Can';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import isEqual from 'react-fast-compare';
import Spinner from '@/components/elements/Spinner';
import Features from '@feature/Features';
import Console from '@/components/server/console/Console';
import StatGraphs from '@/components/server/console/StatGraphs';
import PowerButtons from '@/components/server/console/PowerButtons';
import ServerStatCards from '@/components/server/console/ServerStatCards';
import Alert from '@/components/elements/latte/Alert';
import HostPressureAlert from '@/components/server/console/HostPressureAlert';
import HostStatsBlock from '@/components/server/console/HostStatsBlock';
import useHostStats from '@/plugins/useHostStats';
import styles from './console.module.css';

export type PowerAction = 'start' | 'stop' | 'restart' | 'kill';

const ServerConsoleContainer = () => {
    const name = ServerContext.useStoreState((state) => state.server.data!.name);
    const description = ServerContext.useStoreState((state) => state.server.data!.description);
    const isInstalling = ServerContext.useStoreState((state) => state.server.isInstalling);
    const isTransferring = ServerContext.useStoreState((state) => state.server.data!.isTransferring);
    const eggFeatures = ServerContext.useStoreState((state) => state.server.data!.eggFeatures, isEqual);
    const isNodeUnderMaintenance = ServerContext.useStoreState((state) => state.server.data!.isNodeUnderMaintenance);
    const hostStats = useHostStats();

    return (
        <ServerContentBlock
            title={'Console'}
            eyebrow={'Server'}
            heading={name}
            subtitle={description}
            actions={
                <Can action={['control.start', 'control.stop', 'control.restart']} matchAny>
                    <PowerButtons />
                </Can>
            }
        >
            <div className={styles.screen}>
                {(isNodeUnderMaintenance || isInstalling || isTransferring) && (
                    <Alert tone={'waiting'} icon={ExclamationIcon}>
                        {isNodeUnderMaintenance
                            ? 'The node of this server is currently under maintenance and all actions are unavailable.'
                            : isInstalling
                            ? 'This server is currently running its installation process and most actions are unavailable.'
                            : 'This server is currently being transferred to another node and all actions are unavailable.'}
                    </Alert>
                )}
                <ServerStatCards />
                <HostPressureAlert stats={hostStats} />
                <div className={styles.terminal}>
                    <Spinner.Suspense>
                        <Console />
                    </Spinner.Suspense>
                </div>
                <HostStatsBlock stats={hostStats} />
                <div className={styles.graphs}>
                    <Spinner.Suspense>
                        <StatGraphs />
                    </Spinner.Suspense>
                </div>
            </div>
            <Features enabled={eggFeatures} />
        </ServerContentBlock>
    );
};

export default memo(ServerConsoleContainer, isEqual);
