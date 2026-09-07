import React from 'react';
import { useField } from 'formik';
import { useStoreState } from 'easy-peasy';
import Switch from '@/components/elements/latte/Switch';
import styles from './users.module.css';

interface Props {
    permission: string;
    disabled: boolean;
}

const PermissionRow = ({ permission, disabled }: Props) => {
    const [key, pkey] = permission.split('.', 2);
    const permissions = useStoreState((state) => state.permissions.data);
    const [{ value }, , { setValue }] = useField<string[]>('permissions');

    const description = permissions[key]!.keys[pkey!];

    return (
        <div>
            <Switch
                name={'permissions'}
                disabled={disabled}
                checked={value.includes(permission)}
                onChange={(checked) =>
                    setValue(checked ? [...value, permission] : value.filter((p) => p !== permission))
                }
                label={pkey}
            />
            {description && description.length > 0 && <p className={styles.permissionDescription}>{description}</p>}
        </div>
    );
};

export default PermissionRow;
