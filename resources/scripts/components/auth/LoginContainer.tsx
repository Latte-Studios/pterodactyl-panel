import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, RouteComponentProps } from 'react-router-dom';
import login from '@/api/auth/login';
import LoginFormContainer from '@/components/auth/LoginFormContainer';
import GoogleSsoButton from '@/components/auth/GoogleSsoButton';
import { useStoreState } from 'easy-peasy';
import { Formik, FormikHelpers } from 'formik';
import { object, string } from 'yup';
import FormField from '@/components/elements/latte/FormField';
import Button from '@/components/elements/latte/Button';
import Reaptcha from 'reaptcha';
import useFlash from '@/plugins/useFlash';
import styles from './auth.module.css';

interface Values {
    username: string;
    password: string;
}

/**
 * What the Google callback reports through `?sso_error=`. The codes are the
 * reasons on the server's GoogleSsoException; the texts are what a person
 * standing at the login page needs to know.
 */
const SSO_ERRORS: Record<string, string> = {
    disabled: 'Google sign-in is not enabled.',
    state: 'The Google sign-in session expired, please try again.',
    unverified: 'Your Google account email is not verified.',
    domain: 'Only Google Workspace accounts from an allowed domain can sign in to this panel.',
    'no-account': 'There is no panel account for this Google account. Ask an administrator.',
    'already-linked': 'This Google account is already linked to another user.',
};

const LoginContainer = ({ history, location }: RouteComponentProps) => {
    const ref = useRef<Reaptcha>(null);
    const [token, setToken] = useState('');

    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();
    const { enabled: recaptchaEnabled, siteKey } = useStoreState((state) => state.settings.data!.recaptcha);
    const googleEnabled = useStoreState((state) => state.settings.data!.sso.google.enabled);

    useEffect(() => {
        clearFlashes();

        // The Google callback lands here with the reason in the query so the
        // message survives the round trip; show it once and clean the URL.
        const params = new URLSearchParams(location.search);
        const reason = params.get('sso_error');
        if (reason) {
            addFlash({ type: 'error', message: SSO_ERRORS[reason] ?? 'Google sign-in failed, please try again.' });
            params.delete('sso_error');
            history.replace({ ...location, search: params.toString() ? '?' + params.toString() : '' });
        }
    }, []);

    const onSubmit = (values: Values, { setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes();

        // If there is no token in the state yet, request the token and then abort this submit request
        // since it will be re-submitted when the recaptcha data is returned by the component.
        if (recaptchaEnabled && !token) {
            ref.current!.execute().catch((error) => {
                console.error(error);

                setSubmitting(false);
                clearAndAddHttpError({ error });
            });

            return;
        }

        login({ ...values, recaptchaData: token })
            .then((response) => {
                if (response.complete) {
                    // @ts-expect-error this is valid
                    window.location = response.intended || '/';
                    return;
                }

                history.replace('/auth/login/checkpoint', { token: response.confirmationToken });
            })
            .catch((error) => {
                console.error(error);

                setToken('');
                if (ref.current) ref.current.reset();

                setSubmitting(false);
                clearAndAddHttpError({ error });
            });
    };

    return (
        <Formik
            onSubmit={onSubmit}
            initialValues={{ username: '', password: '' }}
            validationSchema={object().shape({
                username: string().required('A username or email must be provided.'),
                password: string().required('Please enter your account password.'),
            })}
        >
            {({ isSubmitting, setSubmitting, submitForm }) => (
                <LoginFormContainer title={'Login to Continue'}>
                    <div className={styles.fields}>
                        <FormField
                            type={'text'}
                            label={'Username or Email'}
                            name={'username'}
                            disabled={isSubmitting}
                        />
                        <FormField type={'password'} label={'Password'} name={'password'} disabled={isSubmitting} />
                    </div>
                    <div className={styles.action}>
                        <Button type={'submit'} variant={'contained'} size={'large'} block disabled={isSubmitting}>
                            Login
                        </Button>
                    </div>
                    {googleEnabled && (
                        <>
                            <div className={styles.divider} aria-hidden={'true'}>
                                or
                            </div>
                            <GoogleSsoButton size={'large'} block className={styles.google} />
                        </>
                    )}
                    {/*
                     * The badge Google injects is position: fixed, and the card's
                     * backdrop-filter would make the card its containing block. A
                     * portal keeps the widget on the body so the badge stays in the
                     * corner of the window; the ref and callbacks are unaffected.
                     */}
                    {recaptchaEnabled &&
                        createPortal(
                            <Reaptcha
                                ref={ref}
                                size={'invisible'}
                                sitekey={siteKey || '_invalid_key'}
                                onVerify={(response) => {
                                    setToken(response);
                                    submitForm();
                                }}
                                onExpire={() => {
                                    setSubmitting(false);
                                    setToken('');
                                }}
                            />,
                            document.body
                        )}
                    <div className={styles.links}>
                        <Link to={'/auth/password'} className={styles.link}>
                            Forgot password?
                        </Link>
                    </div>
                </LoginFormContainer>
            )}
        </Formik>
    );
};

export default LoginContainer;
