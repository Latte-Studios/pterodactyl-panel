import * as React from 'react';
import { useEffect } from 'react';
import { ExclamationIcon } from '@heroicons/react/outline';
import UpdatePasswordForm from '@/components/dashboard/forms/UpdatePasswordForm';
import UpdateEmailAddressForm from '@/components/dashboard/forms/UpdateEmailAddressForm';
import ConfigureTwoFactorForm from '@/components/dashboard/forms/ConfigureTwoFactorForm';
import GoogleAccountForm from '@/components/dashboard/forms/GoogleAccountForm';
import PageContentBlock from '@/components/elements/PageContentBlock';
import FlashMessageRender from '@/components/FlashMessageRender';
import Alert from '@/components/elements/latte/Alert';
import Card from '@/components/elements/latte/Card';
import { useHistory, useLocation } from 'react-router-dom';
import { useStoreState } from '@/state/hooks';
import useFlash from '@/plugins/useFlash';
import styles from './account.module.css';

const GOOGLE_ERRORS: Record<string, string> = {
    state: 'The Google session expired, please try again.',
    unverified: 'Your Google account email is not verified.',
    domain: 'Only Google Workspace accounts from an allowed domain can be linked.',
    'already-linked': 'This Google account is already linked to another user.',
    mismatch: 'The Google account you chose is not the one linked to this panel account.',
    confirm: 'Confirm your password before linking a Google account.',
};

export default () => {
    const history = useHistory();
    const location = useLocation<undefined | { twoFactorRedirect?: boolean }>();
    const { state } = location;
    const { addFlash, clearFlashes } = useFlash();
    const googleEnabled = useStoreState((state) => state.settings.data!.sso.google.enabled);
    const googleEmail = useStoreState((state) => state.user.data!.googleEmail);

    // The Google callback comes back here after linking or refusing to; the
    // outcome rides in the query so it survives the full-page round trip.
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const linked = params.get('sso_linked');
        const error = params.get('sso_error');
        if (!linked && !error) {
            return;
        }

        clearFlashes('account:google');
        if (linked) {
            addFlash({ key: 'account:google', type: 'success', message: 'Your Google account has been linked.' });
        } else if (error) {
            addFlash({ key: 'account:google', type: 'error', message: GOOGLE_ERRORS[error] ?? 'Linking failed.' });
        }

        params.delete('sso_linked');
        params.delete('sso_error');
        history.replace({ ...location, search: params.toString() ? '?' + params.toString() : '' });
    }, []);

    return (
        <PageContentBlock title={'Account Overview'} eyebrow={'Account'} heading={'Overview'}>
            {state?.twoFactorRedirect && (
                <Alert tone={'bad'} icon={ExclamationIcon} title={'2-Factor Required'}>
                    Your account must have two-factor authentication enabled in order to continue.
                </Alert>
            )}
            <div className={styles.overview}>
                <Card title={'Update Password'}>
                    <FlashMessageRender byKey={'account:password'} />
                    <UpdatePasswordForm />
                </Card>
                <Card title={'Update Email Address'}>
                    <FlashMessageRender byKey={'account:email'} />
                    <UpdateEmailAddressForm />
                </Card>
                <Card title={'Two-Step Verification'}>
                    <ConfigureTwoFactorForm />
                </Card>
                {(googleEnabled || googleEmail) && (
                    <Card title={'Google Account'}>
                        <GoogleAccountForm />
                    </Card>
                )}
            </div>
        </PageContentBlock>
    );
};
