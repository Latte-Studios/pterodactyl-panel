import React, { useState } from 'react';
import { PencilIcon } from '@heroicons/react/outline';
import { Subuser } from '@/state/server/subusers';
import RemoveSubuserButton from '@/components/server/users/RemoveSubuserButton';
import EditSubuserModal from '@/components/server/users/EditSubuserModal';
import Can from '@/components/elements/Can';
import Button from '@/components/elements/latte/Button';
import styles from './users.module.css';

/** A subuser cannot act on their own row, which is why this can render nothing. */
const SubuserActions = ({ subuser, self }: { subuser: Subuser; self: boolean }) => {
    const [visible, setVisible] = useState(false);

    if (self) {
        return null;
    }

    return (
        <div className={styles.actions}>
            <EditSubuserModal subuser={subuser} visible={visible} onModalDismissed={() => setVisible(false)} />
            <Can action={'user.update'}>
                <Button size={'small'} iconOnly aria-label={'Edit subuser'} onClick={() => setVisible(true)}>
                    <PencilIcon width={16} height={16} />
                </Button>
            </Can>
            <Can action={'user.delete'}>
                <RemoveSubuserButton subuser={subuser} />
            </Can>
        </div>
    );
};

export default SubuserActions;
