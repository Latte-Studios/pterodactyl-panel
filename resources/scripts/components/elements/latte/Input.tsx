import React, { forwardRef } from 'react';
import classNames from 'classnames';
import styles from './Input.module.css';

export type InputProps = JSX.IntrinsicElements['input'] & {
    invalid?: boolean;
    mono?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(({ invalid, mono, className, ...rest }, ref) => (
    <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={classNames(styles.input, { [styles.invalid]: invalid, [styles.mono]: mono }, className)}
        {...rest}
    />
));
Input.displayName = 'Input';

export type TextareaProps = JSX.IntrinsicElements['textarea'] & {
    invalid?: boolean;
    mono?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ invalid, mono, className, ...rest }, ref) => (
    <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={classNames(
            styles.input,
            styles.textarea,
            { [styles.invalid]: invalid, [styles.mono]: mono },
            className
        )}
        {...rest}
    />
));
Textarea.displayName = 'Textarea';

export type LabelProps = JSX.IntrinsicElements['label'] & {
    optional?: boolean;
};

export const Label = ({ optional, className, children, ...rest }: LabelProps) => (
    <label className={classNames(styles.label, className)} {...rest}>
        {children}
        {optional && <span className={styles.optional}>optional</span>}
    </label>
);

export interface FieldProps {
    label?: React.ReactNode;
    htmlFor?: string;
    optional?: boolean;
    description?: React.ReactNode;
    /** Replaces the description while it is present. */
    error?: React.ReactNode;
    className?: string;
    children: React.ReactNode;
}

export const Field = ({ label, htmlFor, optional, description, error, className, children }: FieldProps) => (
    <div className={classNames(styles.field, className)}>
        {label && (
            <Label htmlFor={htmlFor} optional={optional}>
                {label}
            </Label>
        )}
        {children}
        {error ? (
            <p className={styles.error}>{error}</p>
        ) : (
            description && <p className={styles.description}>{description}</p>
        )}
    </div>
);

export default Field;
