import React, { useEffect, useState } from 'react';
import { ExclamationIcon } from '@heroicons/react/outline';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import useFileManagerSwr from '@/plugins/useFileManagerSwr';
import useFlash from '@/plugins/useFlash';
import compressFiles from '@/api/server/files/compressFiles';
import { ServerContext } from '@/state/server';
import deleteFiles from '@/api/server/files/deleteFiles';
import RenameFileModal from '@/components/server/files/RenameFileModal';
import Button from '@/components/elements/latte/Button';
import Dialog from '@/components/elements/latte/Dialog';
import Toolbar from '@/components/elements/latte/Toolbar';
import styles from './files.module.css';

/**
 * The selection row of the file manager. It sits in the toolbar rather than
 * floating over the listing, so it never covers a file it is about to act on.
 */
const MassActionsBar = () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);

    const { mutate } = useFileManagerSwr();
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [showMove, setShowMove] = useState(false);
    const directory = ServerContext.useStoreState((state) => state.files.directory);

    const selectedFiles = ServerContext.useStoreState((state) => state.files.selectedFiles);
    const setSelectedFiles = ServerContext.useStoreActions((actions) => actions.files.setSelectedFiles);

    useEffect(() => {
        if (!loading) setLoadingMessage('');
    }, [loading]);

    const onClickCompress = () => {
        setLoading(true);
        clearFlashes('files');
        setLoadingMessage('Archiving files...');

        compressFiles(uuid, directory, selectedFiles)
            .then(() => mutate())
            .then(() => setSelectedFiles([]))
            .catch((error) => clearAndAddHttpError({ key: 'files', error }))
            .then(() => setLoading(false));
    };

    const onClickConfirmDeletion = () => {
        setLoading(true);
        setShowConfirm(false);
        clearFlashes('files');
        setLoadingMessage('Deleting files...');

        deleteFiles(uuid, directory, selectedFiles)
            .then(() => {
                mutate((files) => files.filter((f) => selectedFiles.indexOf(f.name) < 0), false);
                setSelectedFiles([]);
            })
            .catch((error) => {
                mutate();
                clearAndAddHttpError({ key: 'files', error });
            })
            .then(() => setLoading(false));
    };

    if (selectedFiles.length === 0) {
        return null;
    }

    return (
        <>
            <SpinnerOverlay visible={loading} size={'large'} fixed>
                {loadingMessage}
            </SpinnerOverlay>
            {showMove && (
                <RenameFileModal
                    files={selectedFiles}
                    visible
                    appear
                    useMoveTerminology
                    onDismissed={() => setShowMove(false)}
                />
            )}
            <Dialog
                open={showConfirm}
                onClose={() => setShowConfirm(false)}
                title={`Delete ${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'}?`}
                description={'Deleting files is a permanent operation, you cannot undo this action.'}
                icon={ExclamationIcon}
                danger
                footer={
                    <>
                        <Button variant={'text'} onClick={() => setShowConfirm(false)}>
                            Cancel
                        </Button>
                        <Button variant={'danger'} onClick={onClickConfirmDeletion}>
                            Delete
                        </Button>
                    </>
                }
            />
            <span className={styles.selectionCount}>{selectedFiles.length} selected</span>
            <Toolbar.Chips>
                <Toolbar.Chip onClick={() => setShowMove(true)}>Move</Toolbar.Chip>
                <Toolbar.Chip onClick={onClickCompress}>Archive</Toolbar.Chip>
                <Toolbar.Chip onClick={() => setShowConfirm(true)}>Delete</Toolbar.Chip>
                <Toolbar.Chip onClick={() => setSelectedFiles([])}>Clear</Toolbar.Chip>
            </Toolbar.Chips>
        </>
    );
};

export default MassActionsBar;
