import React, { useEffect, useMemo, useState } from 'react';
import { ServerContext } from '@/state/server';
import { Actions, useStoreActions, useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import Spinner from '@/components/elements/Spinner';
import AddSubuserButton from '@/components/server/users/AddSubuserButton';
import SubuserActions from '@/components/server/users/SubuserActions';
import getServerSubusers from '@/api/server/users/getServerSubusers';
import { httpErrorToHuman } from '@/api/http';
import Can from '@/components/elements/Can';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import Avatar from '@/components/elements/latte/Avatar';
import Card from '@/components/elements/latte/Card';
import DataTable, { DataTableColumn } from '@/components/elements/latte/DataTable';
import StatusChip from '@/components/elements/latte/StatusChip';
import { Subuser } from '@/state/server/subusers';
import styles from './users.module.css';

const grantedPermissions = (subuser: Subuser): number =>
    subuser.permissions.filter((permission) => permission !== 'websocket.connect').length;

export default () => {
    const [loading, setLoading] = useState(true);

    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const subusers = ServerContext.useStoreState((state) => state.subusers.data);
    const setSubusers = ServerContext.useStoreActions((actions) => actions.subusers.setSubusers);

    const self = useStoreState((state: ApplicationStore) => state.user.data!.uuid);
    const permissions = useStoreState((state: ApplicationStore) => state.permissions.data);
    const getPermissions = useStoreActions((actions: Actions<ApplicationStore>) => actions.permissions.getPermissions);
    const { addError, clearFlashes } = useStoreActions((actions: Actions<ApplicationStore>) => actions.flashes);

    useEffect(() => {
        clearFlashes('users');
        getServerSubusers(uuid)
            .then((subusers) => {
                setSubusers(subusers);
                setLoading(false);
            })
            .catch((error) => {
                console.error(error);
                addError({ key: 'users', message: httpErrorToHuman(error) });
            });
    }, []);

    useEffect(() => {
        getPermissions().catch((error) => {
            addError({ key: 'users', message: httpErrorToHuman(error) });
            console.error(error);
        });
    }, []);

    const columns: DataTableColumn<Subuser>[] = useMemo(
        () => [
            {
                key: 'user',
                header: 'User',
                render: (subuser) => (
                    <span className={styles.user}>
                        <Avatar name={subuser.email} identifier={subuser.uuid} size={'small'} />
                        <span className={styles.email}>{subuser.email}</span>
                    </span>
                ),
            },
            {
                key: 'twoFactor',
                header: 'Two-factor',
                render: (subuser) => (
                    <StatusChip tone={subuser.twoFactorEnabled ? 'ok' : 'bad'}>
                        {subuser.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </StatusChip>
                ),
            },
            {
                key: 'permissions',
                header: 'Permissions',
                align: 'right',
                width: '140px',
                render: (subuser) => grantedPermissions(subuser),
            },
            {
                key: 'actions',
                header: '',
                align: 'right',
                width: '96px',
                render: (subuser) => <SubuserActions subuser={subuser} self={subuser.uuid === self} />,
            },
        ],
        [self]
    );

    if (!subusers.length && (loading || !Object.keys(permissions).length)) {
        return <Spinner size={'large'} centered />;
    }

    return (
        <ServerContentBlock
            title={'Users'}
            eyebrow={'Server'}
            heading={'Users'}
            subtitle={'People who share access to this server.'}
            showFlashKey={'users'}
            actions={
                <Can action={'user.create'}>
                    <AddSubuserButton />
                </Can>
            }
        >
            <Card flush>
                <DataTable
                    columns={columns}
                    rows={subusers}
                    keyOf={(subuser) => subuser.uuid}
                    empty={"It looks like you don't have any subusers."}
                    mobile={{
                        title: (subuser) => subuser.email,
                        subtitle: (subuser) => `${grantedPermissions(subuser)} permissions`,
                        status: (subuser) => (
                            <StatusChip tone={subuser.twoFactorEnabled ? 'ok' : 'bad'}>
                                {subuser.twoFactorEnabled ? '2FA on' : '2FA off'}
                            </StatusChip>
                        ),
                    }}
                />
            </Card>
        </ServerContentBlock>
    );
};
