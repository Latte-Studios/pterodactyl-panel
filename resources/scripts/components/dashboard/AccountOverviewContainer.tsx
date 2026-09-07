import * as React from 'react';
import { ExclamationIcon } from '@heroicons/react/outline';
import UpdatePasswordForm from '@/components/dashboard/forms/UpdatePasswordForm';
import UpdateEmailAddressForm from '@/components/dashboard/forms/UpdateEmailAddressForm';
import ConfigureTwoFactorForm from '@/components/dashboard/forms/ConfigureTwoFactorForm';
import PageContentBlock from '@/components/elements/PageContentBlock';
import FlashMessageRender from '@/components/FlashMessageRender';
import Alert from '@/components/elements/latte/Alert';
import Card from '@/components/elements/latte/Card';
import { useLocation } from 'react-router-dom';
import styles from './account.module.css';

export default () => {
    const { state } = useLocation<undefined | { twoFactorRedirect?: boolean }>();

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
            </div>
        </PageContentBlock>
    );
};
