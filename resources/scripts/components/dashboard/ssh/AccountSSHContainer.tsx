import React, { useEffect, useMemo } from 'react';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import PageContentBlock from '@/components/elements/PageContentBlock';
import { useSSHKeys } from '@/api/account/ssh-keys';
import { SSHKey } from '@definitions/user';
import { useFlashKey } from '@/plugins/useFlash';
import { format } from 'date-fns';
import CreateSSHKeyForm from '@/components/dashboard/ssh/CreateSSHKeyForm';
import DeleteSSHKeyButton from '@/components/dashboard/ssh/DeleteSSHKeyButton';
import Card from '@/components/elements/latte/Card';
import CopyChip from '@/components/elements/latte/CopyChip';
import DataTable, { DataTableColumn } from '@/components/elements/latte/DataTable';
import styles from '../account.module.css';

export default () => {
    const { clearAndAddHttpError } = useFlashKey('account');
    const { data, isValidating, error } = useSSHKeys({
        revalidateOnMount: true,
        revalidateOnFocus: false,
    });

    useEffect(() => {
        clearAndAddHttpError(error);
    }, [error]);

    const columns: DataTableColumn<SSHKey>[] = useMemo(
        () => [
            {
                key: 'name',
                header: 'Key',
                render: (key) => (
                    <div>
                        <p className={styles.description}>{key.name}</p>
                        <p className={styles.lastUsed}>Added on: {format(key.createdAt, 'MMM do, yyyy HH:mm')}</p>
                    </div>
                ),
            },
            {
                key: 'fingerprint',
                header: 'Fingerprint',
                render: (key) => <CopyChip value={`SHA256:${key.fingerprint}`} />,
            },
            {
                key: 'actions',
                header: '',
                align: 'right',
                width: '56px',
                render: (key) => <DeleteSSHKeyButton name={key.name} fingerprint={key.fingerprint} />,
            },
        ],
        []
    );

    return (
        <PageContentBlock title={'SSH Keys'} eyebrow={'Account'} heading={'SSH Keys'} showFlashKey={'account'}>
            <div className={styles.split}>
                <Card title={'Add SSH Key'}>
                    <CreateSSHKeyForm />
                </Card>
                <Card title={'SSH Keys'} flush>
                    <SpinnerOverlay visible={!data && isValidating} />
                    <DataTable
                        columns={columns}
                        rows={data ?? []}
                        keyOf={(key) => key.fingerprint}
                        empty={!data ? 'Loading...' : 'No SSH Keys exist for this account.'}
                        mobile={{
                            title: (key) => key.name,
                            subtitle: (key) => `SHA256:${key.fingerprint}`,
                            kpis: (key) => [{ label: 'Added', value: format(key.createdAt, 'MMM do, yyyy') }],
                        }}
                    />
                </Card>
            </div>
        </PageContentBlock>
    );
};
