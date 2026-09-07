import React, { useState } from 'react';
import { ExclamationIcon, TrashIcon } from '@heroicons/react/outline';
import { useFlashKey } from '@/plugins/useFlash';
import { deleteSSHKey, useSSHKeys } from '@/api/account/ssh-keys';
import Button from '@/components/elements/latte/Button';
import Dialog from '@/components/elements/latte/Dialog';

export default ({ name, fingerprint }: { name: string; fingerprint: string }) => {
    const { clearAndAddHttpError } = useFlashKey('account');
    const [visible, setVisible] = useState(false);
    const { mutate } = useSSHKeys();

    const onClick = () => {
        clearAndAddHttpError();
        setVisible(false);

        Promise.all([
            mutate(data => data?.filter(value => value.fingerprint !== fingerprint), false),
            deleteSSHKey(fingerprint),
        ]).catch(error => {
            mutate(undefined, true).catch(console.error);
            clearAndAddHttpError(error);
        });
    };

    return (
        <>
            <Dialog
                open={visible}
                onClose={() => setVisible(false)}
                title={'Delete SSH Key'}
                description={`Removing the ${name} SSH key will invalidate its usage across the Panel.`}
                icon={ExclamationIcon}
                danger
                footer={
                    <>
                        <Button variant={'text'} onClick={() => setVisible(false)}>
                            Cancel
                        </Button>
                        <Button variant={'danger'} onClick={onClick}>
                            Delete Key
                        </Button>
                    </>
                }
            />
            <Button
                size={'small'}
                variant={'danger'}
                iconOnly
                aria-label={'Delete SSH key'}
                onClick={() => setVisible(true)}
            >
                <TrashIcon width={16} height={16} />
            </Button>
        </>
    );
};
