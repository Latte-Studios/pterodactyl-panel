import React, { useEffect, useState } from 'react';
import { ExclamationIcon } from '@heroicons/react/outline';
import { ServerContext } from '@/state/server';
import reinstallServer from '@/api/server/reinstallServer';
import { Actions, useStoreActions } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import { httpErrorToHuman } from '@/api/http';
import Button from '@/components/elements/latte/Button';
import Card from '@/components/elements/latte/Card';
import Dialog from '@/components/elements/latte/Dialog';
import styles from './settings.module.css';

export default () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const skipScripts = ServerContext.useStoreState((state) => state.server.data!.skipScripts);
    const [modalVisible, setModalVisible] = useState(false);
    const { addFlash, clearFlashes } = useStoreActions((actions: Actions<ApplicationStore>) => actions.flashes);

    const reinstall = () => {
        clearFlashes('settings');
        reinstallServer(uuid)
            .then(() => {
                addFlash({
                    key: 'settings',
                    type: 'success',
                    message: 'Your server has begun the reinstallation process.',
                });
            })
            .catch((error) => {
                console.error(error);

                addFlash({ key: 'settings', type: 'error', message: httpErrorToHuman(error) });
            })
            .then(() => setModalVisible(false));
    };

    useEffect(() => {
        clearFlashes();
    }, []);

    if (skipScripts) {
        return (
            <Card title={'Reinstall Server'}>
                <p className={styles.value}>
                    Reinstalling this server has been disabled because it is configured to skip its egg&apos;s install
                    script. If you would like to reinstall this server, contact a server administrator.
                </p>
            </Card>
        );
    }

    return (
        <Card
            title={'Reinstall Server'}
            footer={
                <Button variant={'danger'} onClick={() => setModalVisible(true)}>
                    Reinstall Server
                </Button>
            }
        >
            <Dialog
                open={modalVisible}
                onClose={() => setModalVisible(false)}
                title={'Confirm server reinstallation'}
                description={
                    'Your server will be stopped and some files may be deleted or modified during this process, are you sure you wish to continue?'
                }
                icon={ExclamationIcon}
                danger
                footer={
                    <>
                        <Button variant={'text'} onClick={() => setModalVisible(false)}>
                            Cancel
                        </Button>
                        <Button variant={'danger'} onClick={reinstall}>
                            Yes, reinstall server
                        </Button>
                    </>
                }
            />
            <p className={styles.value}>
                Reinstalling your server will stop it, and then re-run the installation script that initially set it
                up.&nbsp;
                <strong>
                    Some files may be deleted or modified during this process, please back up your data before
                    continuing.
                </strong>
            </p>
        </Card>
    );
};
