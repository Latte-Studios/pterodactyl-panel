import React, { forwardRef } from 'react';
import { Field as FormikField, FieldProps } from 'formik';
import { Field, Input } from './Input';

interface OwnProps {
    name: string;
    label?: React.ReactNode;
    description?: React.ReactNode;
    mono?: boolean;
    validate?: (value: unknown) => undefined | string | Promise<unknown>;
}

export type FormFieldProps = OwnProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'>;

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Bridges Formik onto the design system field. Errors only surface once the
 * field has been touched, the same behaviour the old Field element had.
 */
const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
    ({ id, name, label, description, mono, validate, ...props }, ref) => (
        <FormikField innerRef={ref} name={name} validate={validate}>
            {({ field, form: { errors, touched } }: FieldProps) => {
                const error = touched[field.name] ? (errors[field.name] as string | undefined) : undefined;

                return (
                    <Field
                        label={label}
                        htmlFor={id ?? name}
                        description={description}
                        error={error && capitalize(error)}
                    >
                        <Input id={id ?? name} mono={mono} invalid={!!error} {...field} {...props} />
                    </Field>
                );
            }}
        </FormikField>
    ),
);
FormField.displayName = 'FormField';

export default FormField;
