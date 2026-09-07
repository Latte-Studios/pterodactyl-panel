import React, { forwardRef, useState } from 'react';
import { Form } from 'formik';
import { useStoreState } from 'easy-peasy';
import classNames from 'classnames';
import { ApplicationStore } from '@/state';
import FlashMessageRender from '@/components/FlashMessageRender';
import WaveField from '@/components/elements/latte/WaveField';
import styles from './auth.module.css';

type Props = React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement> & {
    title?: string;
    subtitle?: React.ReactNode;
};

/**
 * How much of the waves is left while a field is being typed into. Not zero:
 * the ground should still be the ground behind the panel, just quiet.
 */
const WAVES_WHILE_TYPING = 0.12;

/**
 * The frame every auth screen sits in, and the only screen where the brand
 * shows up in full: Wolf Expresso ground with the waves passing across it.
 *
 * The panel is a plate of the ground rather than a card. The waves run behind
 * it and cross the fields more often than not, so the plate is blurred: they
 * stay visible through it while a field's border and a button's label stay
 * readable where they cross.
 *
 * While a field has the caret the plate closes — near-opaque, a deeper blur —
 * and the waves are turned down, so nothing moves behind the letters somebody
 * is reading back. It reopens the moment the field lets go.
 */
export default forwardRef<HTMLFormElement, Props>(({ title, subtitle, className, children, ...props }, ref) => {
    const name = useStoreState((state: ApplicationStore) => state.settings.data!.name);
    const [typing, setTyping] = useState(false);

    return (
        // Wolf Expresso is a dark surface, so the flash messages inside take the
        // dark theme's semantic tones rather than the ones tuned for paper.
        <div data-surface={'sidebar'} className={styles.screen}>
            <WaveField className={styles.waves} opacity={typing ? WAVES_WHILE_TYPING : 1} />
            <p className={styles.brand}>{name}</p>
            <Form
                {...props}
                ref={ref}
                className={classNames(styles.card, { [styles.cardClosed]: typing }, className)}
                // Focus does not bubble, but its capturing counterparts do, so
                // the panel can watch every field it contains without each of
                // them having to report in.
                onFocusCapture={(event) => {
                    if (event.target instanceof HTMLElement && event.target.matches('input, textarea, select')) {
                        setTyping(true);
                    }
                }}
                onBlurCapture={() => setTyping(false)}
            >
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
