import React, { useState } from 'react';
import EditSubuserModal from '@/components/server/users/EditSubuserModal';
import Button from '@/components/elements/latte/Button';

export default () => {
    const [visible, setVisible] = useState(false);

    return (
        <>
            <EditSubuserModal visible={visible} onModalDismissed={() => setVisible(false)} />
            <Button variant={'contained'} onClick={() => setVisible(true)}>
                New User
            </Button>
        </>
    );
};
