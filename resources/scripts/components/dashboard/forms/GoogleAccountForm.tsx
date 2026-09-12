import React, { useState } from 'react';
import { ExclamationIcon } from '@heroicons/react/outline';
import { useStoreActions, useStoreState } from '@/state/hooks';
import { useFlashKey } from '@/plugins/useFlash';
import unlinkGoogle from '@/api/account/unlinkGoogle';
import Button from '@/components/elements/latte/Button';
import Dialog from '@/components/elements/latte/Dialog';
import FlashMessageRender from '@/components/FlashMessageRender';
import LinkGoogleDialog from '@/components/dashboard/forms/LinkGoogleDialog';
import { format } from 'date-fns';
import styles from '../account.module.css';

/**
 * The Google Workspace account tied to this panel account. Linking asks for
 * the password and then is a browser round trip through Google; only
 * unlinking is a plain API call.
 */
export default () => {
    const [confirming, setConfirming] = useState(false);
    const [linking, setLinking] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { clearAndAddHttpError } = useFlashKey('account:google');
    const googleEmail = useStoreState((state) => state.user.data!.googleEmail);
    const googleLinkedAt = useStoreState((state) => state.user.data!.googleLinkedAt);
    const updateUserData = useStoreActions((actions) => actions.user.updateUserData);

    const onUnlink = () => {
        setSubmitting(true);
        clearAndAddHttpError();

        unlinkGoogle()
            .then(() => {
                updateUserData({ googleEmail: null, googleLinkedAt: null });
                setConfirming(false);
            })
            .catch(clearAndAddHttpError)
            .then(() => setSubmitting(false));
    };

    return (
        <div>
            <Dialog
                open={confirming}
                onClose={() => !submitting && setConfirming(false)}
                title={'Unlink Google Account'}
                description={
                    'You will no longer be able to sign in with Google. If this panel requires two-factor authentication, you will be asked to set it up.'
                }
                icon={ExclamationIcon}
                danger
                footer={
                    <>
                        <Button variant={'text'} onClick={() => setConfirming(false)} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button variant={'danger'} onClick={onUnlink} disabled={submitting}>
                            Unlink
                        </Button>
                    </>
                }
            />
            <LinkGoogleDialog open={linking} onClose={() => setLinking(false)} />
            <FlashMessageRender byKey={'account:google'} className={'mb-4'} />
            {googleEmail ? (
                <>
                    <p className={styles.description}>{googleEmail}</p>
                    <p className={styles.lastUsed}>
                        Linked {googleLinkedAt ? format(googleLinkedAt, "MMM d, yyyy 'at' HH:mm") : ''}. Signing in with
                        Google skips the password and satisfies the two-factor requirement for that session.
                    </p>
                    <div className={'mt-6'}>
                        <Button variant={'danger'} onClick={() => setConfirming(true)}>
                            Unlink Google account
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <p className={styles.muted}>
                        No Google account is linked. Link your Google Workspace account to sign in without a password.
                    </p>
                    <div className={'mt-6'}>
                        <Button onClick={() => setLinking(true)}>Link Google account</Button>
                    </div>
                </>
            )}
        </div>
    );
};
