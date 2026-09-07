import React, { forwardRef } from 'react';
import { Form } from 'formik';
import { useStoreState } from 'easy-peasy';
import classNames from 'classnames';
import { ApplicationStore } from '@/state';
import FlashMessageRender from '@/components/FlashMessageRender';
import Waves from '@/components/elements/latte/Waves';
import styles from './auth.module.css';

type Props = React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement> & {
    title?: string;
    subtitle?: React.ReactNode;
};

/**
 * The frame every auth screen sits in. The waves are behind the card, never
 * across it, so no wave ever crosses a button label.
 */
export default forwardRef<HTMLFormElement, Props>(({ title, subtitle, className, children, ...props }, ref) => {
    const name = useStoreState((state: ApplicationStore) => state.settings.data!.name);

    return (
        <div className={styles.screen}>
            <Waves className={styles.waves} />
            <p className={styles.brand}>{name}</p>
            <Form {...props} ref={ref} className={classNames(styles.card, className)}>
                {title && <h1 className={styles.title}>{title}</h1>}
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                <FlashMessageRender className={styles.flash} />
                {children}
            </Form>
            <p className={styles.credit}>
                &copy; 2015 - {new Date().getFullYear()}&nbsp;
                <a rel={'noopener nofollow noreferrer'} href={'https://pterodactyl.io'} target={'_blank'}>
                    Pterodactyl Software
                </a>
            </p>
        </div>
    );
});
