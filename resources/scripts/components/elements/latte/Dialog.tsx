import React, { useEffect } from 'react';
import classNames from 'classnames';
import Portal from '@/components/elements/Portal';
import styles from './Dialog.module.css';

export interface DialogProps {
    open: boolean;
    onClose: () => void;
    title: React.ReactNode;
    description?: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
    /** Colours the icon with the danger tone. */
    danger?: boolean;
    /** Card footer buttons, 40px. */
    footer?: React.ReactNode;
    className?: string;
    children?: React.ReactNode;
}

const Dialog = ({
    open,
    onClose,
    title,
    description,
    icon: Icon,
    danger,
    footer,
    className,
    children,
}: DialogProps) => {
    useEffect(() => {
        if (!open) {
            return;
        }

        const listener = (e: KeyboardEvent) => e.key === 'Escape' && onClose();

        window.addEventListener('keydown', listener);

        return () => window.removeEventListener('keydown', listener);
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    return (
        <Portal>
            <div className={styles.scrim} onClick={onClose} />
            <div className={styles.positioner}>
                <div role={'dialog'} aria-modal={'true'} className={classNames(styles.dialog, className)}>
                    <header className={styles.header}>
                        {Icon && <Icon className={classNames(styles.icon, { [styles.iconDanger]: danger })} />}
                        <div>
                            <h2 className={styles.title}>{title}</h2>
                            {description && <p className={styles.description}>{description}</p>}
                        </div>
                    </header>
                    {children && <div className={styles.body}>{children}</div>}
                    {footer && <footer className={styles.footer}>{footer}</footer>}
                </div>
            </div>
        </Portal>
    );
};

export default Dialog;
