import React, { useEffect, useMemo, useState } from 'react';
import { ExclamationIcon, TrashIcon } from '@heroicons/react/outline';
import CreateApiKeyForm from '@/components/dashboard/forms/CreateApiKeyForm';
import getApiKeys, { ApiKey } from '@/api/account/getApiKeys';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import deleteApiKey from '@/api/account/deleteApiKey';
import { format } from 'date-fns';
import PageContentBlock from '@/components/elements/PageContentBlock';
import { useFlashKey } from '@/plugins/useFlash';
import Button from '@/components/elements/latte/Button';
import Card from '@/components/elements/latte/Card';
import CopyChip from '@/components/elements/latte/CopyChip';
import DataTable, { DataTableColumn } from '@/components/elements/latte/DataTable';
import Dialog from '@/components/elements/latte/Dialog';
import styles from './account.module.css';

const lastUsed = (key: ApiKey): string => (key.lastUsedAt ? format(key.lastUsedAt, 'MMM do, yyyy HH:mm') : 'Never');

export default () => {
    const [deleteIdentifier, setDeleteIdentifier] = useState('');
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const { clearAndAddHttpError } = useFlashKey('account');

    useEffect(() => {
        getApiKeys()
            .then((keys) => setKeys(keys))
            .then(() => setLoading(false))
            .catch((error) => clearAndAddHttpError(error));
    }, []);

    const doDeletion = (identifier: string) => {
        setLoading(true);

        clearAndAddHttpError();
        deleteApiKey(identifier)
            .then(() => setKeys((s) => [...(s || []).filter((key) => key.identifier !== identifier)]))
            .catch((error) => clearAndAddHttpError(error))
            .then(() => {
                setLoading(false);
                setDeleteIdentifier('');
            });
    };

    const columns: DataTableColumn<ApiKey>[] = useMemo(
        () => [
            {
                key: 'description',
                header: 'Key',
                render: (key) => (
                    <div>
                        <p className={styles.description}>{key.description}</p>
                        <p className={styles.lastUsed}>Last used: {lastUsed(key)}</p>
                    </div>
                ),
            },
            {
                key: 'identifier',
                header: 'Identifier',
                render: (key) => <CopyChip value={key.identifier} />,
            },
            {
                key: 'actions',
                header: '',
                align: 'right',
                width: '56px',
                render: (key) => (
                    <Button
                        size={'small'}
                        variant={'danger'}
                        iconOnly
                        aria-label={'Delete API key'}
                        onClick={() => setDeleteIdentifier(key.identifier)}
                    >
                        <TrashIcon width={16} height={16} />
                    </Button>
                ),
            },
        ],
        []
    );

    return (
        <PageContentBlock
            title={'Account API'}
            eyebrow={'Account'}
            heading={'API Credentials'}
            showFlashKey={'account'}
        >
            <Dialog
                open={!!deleteIdentifier}
                onClose={() => setDeleteIdentifier('')}
                title={'Delete API Key'}
                description={`All requests using the ${deleteIdentifier} key will be invalidated.`}
                icon={ExclamationIcon}
                danger
                footer={
                    <>
                        <Button variant={'text'} onClick={() => setDeleteIdentifier('')}>
                            Cancel
                        </Button>
                        <Button variant={'danger'} onClick={() => doDeletion(deleteIdentifier)}>
                            Delete Key
                        </Button>
                    </>
                }
            />
            <div className={styles.split}>
                <Card title={'Create API Key'}>
                    <CreateApiKeyForm onKeyCreated={(key) => setKeys((s) => [...s!, key])} />
                </Card>
                <Card title={'API Keys'} flush>
                    <SpinnerOverlay visible={loading} />
                    <DataTable
                        columns={columns}
                        rows={keys}
                        keyOf={(key) => key.identifier}
                        empty={loading ? 'Loading...' : 'No API keys exist for this account.'}
                        mobile={{
                            title: (key) => key.description,
                            subtitle: (key) => key.identifier,
                            kpis: (key) => [{ label: 'Last used', value: lastUsed(key) }],
                        }}
                    />
                </Card>
            </div>
        </PageContentBlock>
    );
};
