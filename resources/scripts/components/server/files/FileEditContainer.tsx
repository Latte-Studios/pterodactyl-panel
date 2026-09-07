import React, { useCallback, useEffect, useState } from 'react';
import getFileContents from '@/api/server/files/getFileContents';
import { httpErrorToHuman } from '@/api/http';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import saveFileContents from '@/api/server/files/saveFileContents';
import FileManagerBreadcrumbs from '@/components/server/files/FileManagerBreadcrumbs';
import Alert from '@/components/elements/latte/Alert';
import { InformationCircleIcon } from '@heroicons/react/outline';
import styles from './files.module.css';
import { useHistory, useLocation, useParams } from 'react-router';
import FileNameModal from '@/components/server/files/FileNameModal';
import Can from '@/components/elements/Can';
import PageContentBlock from '@/components/elements/PageContentBlock';
import { ServerError } from '@/components/elements/ScreenBlock';
import Button from '@/components/elements/latte/Button';
import Select from '@/components/elements/Select';
import modes from '@/modes';
import useFlash from '@/plugins/useFlash';
import { ServerContext } from '@/state/server';
import ErrorBoundary from '@/components/elements/ErrorBoundary';
import { encodePathSegments, hashToPath } from '@/helpers';
import { dirname } from 'pathe';
import CodemirrorEditor from '@/components/elements/CodemirrorEditor';

const getNewFileDraftKey = (uuid: string, directory: string) => `pterodactyl:new-file:${uuid}:${directory}`;

export default () => {
    const [error, setError] = useState('');
    const { action } = useParams<{ action: 'new' | string }>();
    const [loading, setLoading] = useState(action === 'edit');
    const [content, setContent] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [mode, setMode] = useState('text/plain');

    const history = useHistory();
    const { hash } = useLocation();

    const id = ServerContext.useStoreState((state) => state.server.data!.id);
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const setDirectory = ServerContext.useStoreActions((actions) => actions.files.setDirectory);
    const { addError, clearFlashes } = useFlash();

    const filePath = hashToPath(hash);
    const directory = action === 'new' ? filePath : dirname(filePath);
    const draftKey = action === 'new' ? getNewFileDraftKey(uuid, directory) : undefined;
    const saveDraft = useCallback(
        (value: string) => {
            if (!draftKey) return;

            if (value.length > 0) {
                sessionStorage.setItem(draftKey, value);
            } else {
                sessionStorage.removeItem(draftKey);
            }
        },
        [draftKey]
    );

    let fetchFileContent: null | (() => Promise<string>) = null;

    useEffect(() => {
        setDirectory(directory);
    }, [directory, setDirectory]);

    useEffect(() => {
        if (!draftKey) return;

        setContent(sessionStorage.getItem(draftKey) || '');
    }, [draftKey]);

    useEffect(() => {
        if (action === 'new') return;

        setError('');
        setLoading(true);
        getFileContents(uuid, filePath)
            .then(setContent)
            .catch((error) => {
                console.error(error);
                setError(httpErrorToHuman(error));
            })
            .then(() => setLoading(false));
    }, [action, uuid, filePath]);

    const save = async (name?: string) => {
        if (!fetchFileContent) {
            return;
        }

        setLoading(true);
        clearFlashes('files:view');

        let redirecting = false;

        try {
            const content = await fetchFileContent();

            await saveFileContents(uuid, name || filePath, content);

            if (name) {
                if (draftKey) {
                    sessionStorage.removeItem(draftKey);
                }

                history.push(`/server/${id}/files/edit#/${encodePathSegments(name)}`);
                redirecting = true;
                return;
            }
        } catch (error) {
            console.error(error);
            addError({ message: httpErrorToHuman(error), key: 'files:view' });
        } finally {
            if (!redirecting) {
                setLoading(false);
            }
        }
    };

    if (error) {
        return <ServerError message={error} onBack={() => history.goBack()} />;
    }

    return (
        <PageContentBlock
            eyebrow={'Files'}
            heading={action === 'edit' ? 'Edit file' : 'New file'}
            showFlashKey={'files:view'}
        >
            <ErrorBoundary>
                <FileManagerBreadcrumbs withinFileEditor isNewFile={action !== 'edit'} />
            </ErrorBoundary>
            {hash.replace(/^#/, '').endsWith('.pteroignore') && (
                <Alert tone={'progress'} icon={InformationCircleIcon}>
                    You&apos;re editing a <code className={styles.code}>.pteroignore</code> file. Any files or
                    directories listed in here will be excluded from backups. Wildcards are supported by using an
                    asterisk (<code className={styles.code}>*</code>). You can negate a prior rule by prepending an
                    exclamation point (<code className={styles.code}>!</code>).
                </Alert>
            )}
            <FileNameModal
                visible={modalVisible}
                onDismissed={() => setModalVisible(false)}
                onFileNamed={(name) => {
                    setModalVisible(false);
                    save(name);
                }}
            />
            <div className={styles.editor}>
                <SpinnerOverlay visible={loading} />
                <CodemirrorEditor
                    mode={mode}
                    filename={hash.replace(/^#/, '')}
                    onModeChanged={setMode}
                    initialContent={content}
                    fetchContent={(value) => {
                        fetchFileContent = value;
                    }}
                    onContentSaved={() => {
                        if (action !== 'edit') {
                            setModalVisible(true);
                        } else {
                            save();
                        }
                    }}
                    onContentChanged={action === 'new' ? saveDraft : undefined}
                />
            </div>
            <div className={styles.editorFooter}>
                <Select value={mode} onChange={(e) => setMode(e.currentTarget.value)} className={styles.mode}>
                    {modes.map((mode) => (
                        <option key={`${mode.name}_${mode.mime}`} value={mode.mime}>
                            {mode.name}
                        </option>
                    ))}
                </Select>
                {action === 'edit' ? (
                    <Can action={'file.update'}>
                        <Button variant={'contained'} onClick={() => save()}>
                            Save Content
                        </Button>
                    </Can>
                ) : (
                    <Can action={'file.create'}>
                        <Button variant={'contained'} onClick={() => setModalVisible(true)}>
                            Create File
                        </Button>
                    </Can>
                )}
            </div>
        </PageContentBlock>
    );
};
