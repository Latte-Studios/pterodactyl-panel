import React from 'react';
import { ExclamationCircleIcon, RefreshIcon } from '@heroicons/react/outline';
import PageContentBlock from '@/components/elements/PageContentBlock';
import Button from '@/components/elements/latte/Button';
import Waves from '@/components/elements/latte/Waves';
import styles from './ScreenBlock.module.css';

interface BaseProps {
    title: string;
    message: string;
    /** Section 9.7 keeps the waves for empty states, not for errors. */
    waves?: boolean;
    icon?: React.ComponentType<{ className?: string }>;
    onRetry?: () => void;
    onBack?: () => void;
}

interface PropsWithRetry extends BaseProps {
    onRetry?: () => void;
    onBack?: never;
}

interface PropsWithBack extends BaseProps {
    onBack?: () => void;
    onRetry?: never;
}

export type ScreenBlockProps = PropsWithBack | PropsWithRetry;

const ScreenBlock = ({
    title,
    message,
    waves,
    icon: Icon = ExclamationCircleIcon,
    onBack,
    onRetry,
}: ScreenBlockProps) => (
    <PageContentBlock>
        <div className={styles.block}>
            {waves && <Waves className={styles.waves} opacity={0.14} />}
            <Icon className={styles.icon} />
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.message}>{message}</p>
            {(typeof onBack === 'function' || typeof onRetry === 'function') && (
                <div className={styles.action}>
                    <Button variant={'text'} onClick={() => (onRetry ? onRetry() : onBack ? onBack() : undefined)}>
                        {onRetry ? (
                            <>
                                <RefreshIcon width={16} height={16} />
                                Try again
                            </>
                        ) : (
                            'Go back'
                        )}
                    </Button>
                </div>
            )}
        </div>
    </PageContentBlock>
);

type ServerErrorProps = (Omit<PropsWithBack, 'title'> | Omit<PropsWithRetry, 'title'>) & {
    title?: string;
};

const ServerError = ({ title, ...props }: ServerErrorProps) => (
    <ScreenBlock title={title || 'Something went wrong'} {...props} />
);

const NotFound = ({ title, message, onBack }: Partial<Pick<ScreenBlockProps, 'title' | 'message' | 'onBack'>>) => (
    <ScreenBlock title={title || '404'} message={message || 'The requested resource was not found.'} onBack={onBack} />
);

export { ServerError, NotFound };
export default ScreenBlock;
