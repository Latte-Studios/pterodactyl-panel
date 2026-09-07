import React, { useState } from 'react';
import { EyeIcon, TrashIcon } from '@heroicons/react/outline';
import Modal from '@/components/elements/Modal';
import { Form, Formik, FormikHelpers } from 'formik';
import { object, string } from 'yup';
import FlashMessageRender from '@/components/FlashMessageRender';
import { ServerContext } from '@/state/server';
import deleteServerDatabase from '@/api/server/databases/deleteServerDatabase';
import { httpErrorToHuman } from '@/api/http';
import RotatePasswordButton from '@/components/server/databases/RotatePasswordButton';
import Can from '@/components/elements/Can';
import { ServerDatabase } from '@/api/server/databases/getServerDatabases';
import useFlash from '@/plugins/useFlash';
import Button from '@/components/elements/latte/Button';
import CopyChip from '@/components/elements/latte/CopyChip';
import FormField from '@/components/elements/latte/FormField';
import { Field } from '@/components/elements/latte/Input';
import styles from './databases.module.css';

/**
 * The per-row actions of the database table: the connection details and the
 * deletion confirmation. They live in their own component because both carry
 * state that belongs to a single row.
 */
const DatabaseActions = ({ database }: { database: ServerDatabase }) => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { addError, clearFlashes } = useFlash();
    const [deleting, setDeleting] = useState(false);
    const [details, setDetails] = useState(false);

    const appendDatabase = ServerContext.useStoreActions((actions) => actions.databases.appendDatabase);
    const removeDatabase = ServerContext.useStoreActions((actions) => actions.databases.removeDatabase);

    const jdbcConnectionString = `jdbc:mysql://${database.username}${
        database.password ? `:${encodeURIComponent(database.password)}` : ''
    }@${database.connectionString}/${database.name}`;

    const schema = object().shape({
        confirm: string()
            .required('The database name must be provided.')
            .oneOf([database.name.split('_', 2)[1], database.name], 'The database name must be provided.'),
    });

    const submit = (values: { confirm: string }, { setSubmitting }: FormikHelpers<{ confirm: string }>) => {
        clearFlashes();
        deleteServerDatabase(uuid, database.id)
            .then(() => {
                setDeleting(false);
                setTimeout(() => removeDatabase(database.id), 150);
            })
            .catch((error) => {
                console.error(error);
                setSubmitting(false);
                addError({ key: 'database:delete', message: httpErrorToHuman(error) });
            });
    };

    return (
        <>
            <Formik onSubmit={submit} initialValues={{ confirm: '' }} validationSchema={schema} isInitialValid={false}>
                {({ isSubmitting, isValid, resetForm }) => (
                    <Modal
                        visible={deleting}
                        dismissable={!isSubmitting}
                        showSpinnerOverlay={isSubmitting}
                        onDismissed={() => {
                            setDeleting(false);
                            resetForm();
                        }}
                    >
                        <FlashMessageRender byKey={'database:delete'} className={styles.flash} />
                        <h2 className={styles.modalTitle}>Confirm database deletion</h2>
                        <p className={styles.modalBody}>
                            Deleting a database is a permanent action, it cannot be undone. This will permanently delete
                            the <strong>{database.name}</strong> database and remove all associated data.
                        </p>
                        <Form className={styles.modalForm}>
                            <FormField
                                type={'text'}
                                id={'confirm_name'}
                                name={'confirm'}
                                label={'Confirm Database Name'}
                                description={'Enter the database name to confirm deletion.'}
                            />
                            <div className={styles.modalActions}>
                                <Button variant={'text'} onClick={() => setDeleting(false)}>
                                    Cancel
                                </Button>
                                <Button type={'submit'} variant={'danger'} disabled={!isValid}>
                                    Delete Database
                                </Button>
                            </div>
                        </Form>
                    </Modal>
                )}
            </Formik>
            <Modal visible={details} onDismissed={() => setDetails(false)}>
                <FlashMessageRender byKey={'database-connection-modal'} className={styles.flash} />
                <h2 className={styles.modalTitle}>Database connection details</h2>
                <div className={styles.details}>
                    <Field label={'Endpoint'}>
                        <CopyChip value={database.connectionString} />
                    </Field>
                    <Field label={'Connections from'}>
                        <p className={styles.detailValue}>{database.allowConnectionsFrom}</p>
                    </Field>
                    <Field label={'Username'}>
                        <CopyChip value={database.username} />
                    </Field>
                    <Can action={'database.view_password'}>
                        <Field label={'Password'}>
                            <CopyChip value={database.password ?? ''} />
                        </Field>
                    </Can>
                    <Field label={'JDBC Connection String'}>
                        <CopyChip value={jdbcConnectionString} />
                    </Field>
                </div>
                <div className={styles.modalActions}>
                    <Can action={'database.update'}>
                        <RotatePasswordButton databaseId={database.id} onUpdate={appendDatabase} />
                    </Can>
                    <Button variant={'text'} onClick={() => setDetails(false)}>
                        Close
                    </Button>
                </div>
            </Modal>
            <div className={styles.actions}>
                <Button size={'small'} iconOnly aria-label={'Connection details'} onClick={() => setDetails(true)}>
                    <EyeIcon width={16} height={16} />
                </Button>
                <Can action={'database.delete'}>
                    <Button
                        size={'small'}
                        variant={'danger'}
                        iconOnly
                        aria-label={'Delete database'}
                        onClick={() => setDeleting(true)}
                    >
                        <TrashIcon width={16} height={16} />
                    </Button>
                </Can>
            </div>
        </>
    );
};

export default DatabaseActions;
