import React, { useEffect } from 'react';
import classNames from 'classnames';
import FlashMessageRender from '@/components/FlashMessageRender';
import PageHeader from '@/components/elements/latte/PageHeader';
import styles from './PageContentBlock.module.css';

export interface PageContentBlockProps {
    /** Sets the document title. */
    title?: string;
    /** The area this screen belongs to, in caps above the heading. */
    eyebrow?: React.ReactNode;
    /** The page heading. A screen opts into the header by passing this. */
    heading?: React.ReactNode;
    subtitle?: React.ReactNode;
    /** At most two buttons, at most one of them contained. */
    actions?: React.ReactNode;
    className?: string;
    showFlashKey?: string;
    children?: React.ReactNode;
}

/**
 * The frame every client screen sits in. The page padding belongs to the shell;
 * this only stacks the header, the flash messages and the screen itself.
 */
const PageContentBlock: React.FC<PageContentBlockProps> = ({
    title,
    eyebrow,
    heading,
    subtitle,
    actions,
    showFlashKey,
    className,
    children,
}) => {
    useEffect(() => {
        if (title) {
            document.title = title;
        }
    }, [title]);

    return (
        <div className={classNames(styles.page, className)}>
            {heading && <PageHeader eyebrow={eyebrow} title={heading} subtitle={subtitle} actions={actions} />}
            {showFlashKey && <FlashMessageRender byKey={showFlashKey} className={styles.flash} />}
            {children}
        </div>
    );
};

export default PageContentBlock;
