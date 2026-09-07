import { ExclamationIcon, ShieldExclamationIcon } from '@heroicons/react/outline';
import React from 'react';
import classNames from 'classnames';

interface AlertProps {
    type: 'warning' | 'danger';
    className?: string;
    children: React.ReactNode;
}

export default ({ type, className, children }: AlertProps) => {
    return (
        <div
            className={classNames(
                'flex items-center border-l-8 rounded-input px-4 py-3',
                {
                    ['border-ls-danger bg-ls-bad-bg text-ls-danger']: type === 'danger',
                    ['border-ls-waiting bg-ls-waiting-bg text-ls-waiting']: type === 'warning',
                },
                className
            )}
        >
            {type === 'danger' ? (
                <ShieldExclamationIcon className={'w-6 h-6 mr-2'} />
            ) : (
                <ExclamationIcon className={'w-6 h-6 mr-2'} />
            )}
            {children}
        </div>
    );
};
