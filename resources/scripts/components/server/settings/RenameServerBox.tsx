import React from 'react';
import { ServerContext } from '@/state/server';
import { Field as FormikField, Form, Formik, FormikHelpers, useFormikContext } from 'formik';
import { Actions, useStoreActions } from 'easy-peasy';
import renameServer from '@/api/server/renameServer';
import { object, string } from 'yup';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import { ApplicationStore } from '@/state';
import { httpErrorToHuman } from '@/api/http';
import FormikFieldWrapper from '@/components/elements/FormikFieldWrapper';
import Button from '@/components/elements/latte/Button';
import Card from '@/components/elements/latte/Card';
import FormField from '@/components/elements/latte/FormField';
import { Field, Label, Textarea } from '@/components/elements/latte/Input';
import styles from './settings.module.css';

interface Values {
    name: string;
    description: string;
}

const RenameServerBox = () => {
    const { isSubmitting } = useFormikContext<Values>();

    return (
        <Form>
            <Card
                title={'Change Server Details'}
                footer={
                    <Button type={'submit'} variant={'contained'}>
                        Save
                    </Button>
                }
            >
                <SpinnerOverlay visible={isSubmitting} />
                <div className={styles.fields}>
                    <FormField id={'name'} name={'name'} label={'Server Name'} type={'text'} />
                    <Field label={<Label htmlFor={'description'}>Server Description</Label>}>
                        <FormikFieldWrapper name={'description'}>
                            <FormikField as={Textarea} id={'description'} name={'description'} rows={3} />
                        </FormikFieldWrapper>
                    </Field>
                </div>
            </Card>
        </Form>
    );
};

export default () => {
    const server = ServerContext.useStoreState(state => state.server.data!);
    const setServer = ServerContext.useStoreActions(actions => actions.server.setServer);
    const { addError, clearFlashes } = useStoreActions((actions: Actions<ApplicationStore>) => actions.flashes);

    const submit = ({ name, description }: Values, { setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes('settings');
        renameServer(server.uuid, name, description)
            .then(() => setServer({ ...server, name, description }))
            .catch(error => {
                console.error(error);
                addError({ key: 'settings', message: httpErrorToHuman(error) });
            })
            .then(() => setSubmitting(false));
    };

    return (
        <Formik
            onSubmit={submit}
            initialValues={{
                name: server.name,
                description: server.description,
            }}
            validationSchema={object().shape({
                name: string().required().min(1),
                description: string().nullable(),
            })}
        >
            <RenameServerBox />
        </Formik>
    );
};
