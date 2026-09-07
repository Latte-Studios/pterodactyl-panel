import React, { memo, useCallback } from 'react';
import { useField } from 'formik';
import isEqual from 'react-fast-compare';
import Switch from '@/components/elements/latte/Switch';
import styles from './users.module.css';

interface Props {
    isEditable: boolean;
    title: string;
    description?: React.ReactNode;
    permissions: string[];
    className?: string;
    children?: React.ReactNode;
}

/** One group of permissions, with a switch that grants or revokes the lot. */
const PermissionTitleBox: React.FC<Props> = memo(
    ({ isEditable, title, description, permissions, className, children }) => {
        const [{ value }, , { setValue }] = useField<string[]>('permissions');

        const onGroupToggled = useCallback(
            (checked: boolean) => {
                if (checked) {
                    setValue([...value, ...permissions.filter(p => !value.includes(p))]);
                } else {
                    setValue(value.filter(p => !permissions.includes(p)));
                }
            },
            [permissions, value],
        );

        return (
            <section className={className}>
                <div className={styles.group}>
                    <div className={styles.groupHeader}>
                        <div>
                            <p className={styles.groupTitle}>{title}</p>
                            {description && <p className={styles.groupDescription}>{description}</p>}
                        </div>
                        {isEditable && (
                            <Switch
                                checked={permissions.every(p => value.includes(p))}
                                onChange={onGroupToggled}
                                label={'All'}
                            />
                        )}
                    </div>
                    <div className={styles.groupItems}>{children}</div>
                </div>
            </section>
        );
    },
    isEqual,
);
PermissionTitleBox.displayName = 'PermissionTitleBox';

export default PermissionTitleBox;
