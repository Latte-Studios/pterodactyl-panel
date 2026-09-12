import React, { useState } from 'react';
import { useFlashKey } from '@/plugins/useFlash';
import confirmGoogleLink from '@/api/account/confirmGoogleLink';
import Button from '@/components/elements/latte/Button';
import Dialog from '@/components/elements/latte/Dialog';
import { Field, Input } from '@/components/elements/latte/Input';
import FlashMessageRender from '@/components/FlashMessageRender';
import { GoogleMark } from '@/components/auth/GoogleSsoButton';

interface Props {
    open: boolean;
    onClose: () => void;
}

/**
 * Asks for the account password before the browser leaves for Google. The
 * panel refuses to start linking without a confirmation from moments ago, so
 * a stolen session cannot attach a new way into the account on its own.
 */
export default ({ open, onClose }: Props) => {
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { clearAndAddHttpError } = useFlashKey('account:google:link');

    const close = () => {
        if (submitting) return;
        setPassword('');
        onClose();
    };

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (submitting || !password.length) return;

        setSubmitting(true);
        clearAndAddHttpError();
        confirmGoogleLink(password)
            .then(() => {
                // A full-page navigation, not a fetch: the panel answers with a
                // redirect to Google and the browser has to follow it.
                window.location.href = '/auth/sso/google';
            })
            .catch((error) => {
                clearAndAddHttpError(error);
                setSubmitting(false);
            });
    };

    return (
        <Dialog
            open={open}
            onClose={close}
            title={'Link Google Account'}
            description={'Confirm your password, then choose the Google Workspace account to sign in with.'}
            footer={
                <>
                    <Button variant={'text'} onClick={close} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button
                        variant={'contained'}
                        type={'submit'}
                        form={'link-google-form'}
                        disabled={submitting || !password.length}
                    >
                        <GoogleMark />
                        Continue with Google
                    </Button>
                </>
            }
        >
            <form id={'link-google-form'} onSubmit={submit}>
                <FlashMessageRender byKey={'account:google:link'} className={'mb-4'} />
                <Field label={'Password'} htmlFor={'link-google-password'}>
                    <Input
                        id={'link-google-password'}
                        type={'password'}
                        autoComplete={'current-password'}
                        autoFocus
                        value={password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.currentTarget.value)}
                    />
                </Field>
            </form>
        </Dialog>
    );
};
