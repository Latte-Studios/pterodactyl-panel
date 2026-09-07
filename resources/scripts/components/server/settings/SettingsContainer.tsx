import React from 'react';
import { ServerContext } from '@/state/server';
import { useStoreState } from 'easy-peasy';
import RenameServerBox from '@/components/server/settings/RenameServerBox';
import Can from '@/components/elements/Can';
import ReinstallServerBox from '@/components/server/settings/ReinstallServerBox';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import isEqual from 'react-fast-compare';
import { ip } from '@/lib/formatters';
import { InformationCircleIcon, KeyIcon, UserIcon } from '@heroicons/react/outline';
import Alert from '@/components/elements/latte/Alert';
import Button from '@/components/elements/latte/Button';
import Card from '@/components/elements/latte/Card';
import CopyChip from '@/components/elements/latte/CopyChip';
import { Field } from '@/components/elements/latte/Input';
import styles from './settings.module.css';

export default () => {
    const username = useStoreState(state => state.user.data!.username);
    const id = ServerContext.useStoreState(state => state.server.data!.id);
    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);
    const node = ServerContext.useStoreState(state => state.server.data!.node);
    const sftp = ServerContext.useStoreState(state => state.server.data!.sftpDetails, isEqual);

    const address = `sftp://${ip(sftp.ip)}:${sftp.port}`;
    const sftpUser = `${username}.${id}`;

    return (
        <ServerContentBlock
            title={'Settings'}
            eyebrow={'Server'}
            heading={'Settings'}
            showFlashKey={'settings'}
        >
            <div className={styles.columns}>
                <div className={styles.column}>
                    <Can action={'file.sftp'}>
                        <Card
                            title={'SFTP Details'}
                            footer={
                                <a href={`sftp://${sftpUser}@${ip(sftp.ip)}:${sftp.port}`}>
                                    <Button variant={'outline'}>Launch SFTP</Button>
                                </a>
                            }
                        >
                            <div className={styles.fields}>
                                <Field label={'Server Address'}>
                                    <CopyChip value={address} icon={KeyIcon} />
                                </Field>
                                <Field label={'Username'}>
                                    <CopyChip value={sftpUser} icon={UserIcon} />
                                </Field>
                                <Alert tone={'progress'} icon={InformationCircleIcon}>
                                    Your SFTP password is the same as the password you use to access this panel.
                                </Alert>
                            </div>
                        </Card>
                    </Can>
                    <Card title={'Debug Information'}>
                        <div className={styles.fields}>
                            <Field label={'Node'}>
                                <p className={styles.value}>{node}</p>
                            </Field>
                            <Field label={'Server ID'}>
                                <CopyChip value={uuid} />
                            </Field>
                        </div>
                    </Card>
                </div>
                <div className={styles.column}>
                    <Can action={'settings.rename'}>
                        <RenameServerBox />
                    </Can>
                    <Can action={'settings.reinstall'}>
                        <ReinstallServerBox />
                    </Can>
                </div>
            </div>
        </ServerContentBlock>
    );
};
