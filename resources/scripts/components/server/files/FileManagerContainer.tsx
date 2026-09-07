import React, { useEffect, useMemo } from 'react';
import { httpErrorToHuman } from '@/api/http';
import Spinner from '@/components/elements/Spinner';
import FileManagerBreadcrumbs from '@/components/server/files/FileManagerBreadcrumbs';
import FileDropdownMenu from '@/components/server/files/FileDropdownMenu';
import { FileObject } from '@/api/server/files/loadDirectory';
import NewDirectoryButton from '@/components/server/files/NewDirectoryButton';
import { NavLink, useHistory, useLocation, useRouteMatch } from 'react-router-dom';
import Can from '@/components/elements/Can';
import { ServerError } from '@/components/elements/ScreenBlock';
import { ServerContext } from '@/state/server';
import useFileManagerSwr from '@/plugins/useFileManagerSwr';
import FileManagerStatus from '@/components/server/files/FileManagerStatus';
import MassActionsBar from '@/components/server/files/MassActionsBar';
import UploadButton from '@/components/server/files/UploadButton';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { useStoreActions } from '@/state/hooks';
import ErrorBoundary from '@/components/elements/ErrorBoundary';
import SelectFileCheckbox, { FileActionCheckbox } from '@/components/server/files/SelectFileCheckbox';
import { encodePathSegments, hashToPath } from '@/helpers';
import { differenceInHours, format, formatDistanceToNow } from 'date-fns';
import { join } from 'pathe';
import { bytesToString } from '@/lib/formatters';
import { usePermissions } from '@/plugins/usePermissions';
import Alert from '@/components/elements/latte/Alert';
import Button from '@/components/elements/latte/Button';
import Card from '@/components/elements/latte/Card';
import DataTable, { DataTableColumn } from '@/components/elements/latte/DataTable';
import Toolbar from '@/components/elements/latte/Toolbar';
import { DocumentIcon, DocumentTextIcon, ExclamationIcon, FolderIcon, LinkIcon } from '@heroicons/react/outline';
import styles from './files.module.css';

const LIMIT = 250;

const sortFiles = (files: FileObject[]): FileObject[] => {
    const sortedFiles: FileObject[] = files
        .sort((a, b) => a.name.localeCompare(b.name))
        .sort((a, b) => (a.isFile === b.isFile ? 0 : a.isFile ? 1 : -1));
    return sortedFiles.filter((file, index) => index === 0 || file.name !== sortedFiles[index - 1].name);
};

const modified = (file: FileObject): string =>
    Math.abs(differenceInHours(file.modifiedAt, new Date())) > 48
        ? format(file.modifiedAt, 'MMM do, yyyy h:mma')
        : formatDistanceToNow(file.modifiedAt, { addSuffix: true });

/** Opening a file is the row click, so the name itself is plain text. */
const FileName = ({ file }: { file: FileObject }) => {
    const Icon = file.isFile
        ? file.isSymlink
            ? LinkIcon
            : file.isArchiveType()
            ? DocumentIcon
            : DocumentTextIcon
        : FolderIcon;

    return (
        <span className={styles.file}>
            <Icon className={styles.icon} />
            <span className={styles.fileName}>{file.name}</span>
        </span>
    );
};

/** Keeps a control inside a row from also triggering the row itself. */
const Standalone = ({ children }: { children: React.ReactNode }) => (
    <span className={styles.standalone} onClick={(event) => event.stopPropagation()}>
        {children}
    </span>
);

export default () => {
    const id = ServerContext.useStoreState((state) => state.server.data!.id);
    const history = useHistory();
    const match = useRouteMatch();
    const [canRead] = usePermissions(['file.read']);
    const [canReadContents] = usePermissions(['file.read-content']);
    const { hash } = useLocation();
    const { data: files, error, mutate } = useFileManagerSwr();
    const directory = ServerContext.useStoreState((state) => state.files.directory);
    const clearFlashes = useStoreActions((actions) => actions.flashes.clearFlashes);
    const setDirectory = ServerContext.useStoreActions((actions) => actions.files.setDirectory);

    const setSelectedFiles = ServerContext.useStoreActions((actions) => actions.files.setSelectedFiles);
    const selectedFilesLength = ServerContext.useStoreState((state) => state.files.selectedFiles.length);

    useEffect(() => {
        clearFlashes('files');
        setSelectedFiles([]);
        setDirectory(hashToPath(hash));
    }, [hash]);

    useEffect(() => {
        mutate();
    }, [directory]);

    const onSelectAllClick = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedFiles(e.currentTarget.checked ? files?.map((file) => file.name) || [] : []);
    };

    const canOpen = (file: FileObject): boolean => (file.isFile ? file.isEditable() && canReadContents : canRead);

    const onRowClick = (file: FileObject) => {
        if (!canOpen(file)) {
            return;
        }

        history.push(`${match.url}${file.isFile ? '/edit' : ''}#${encodePathSegments(join(directory, file.name))}`);
    };

    const columns: DataTableColumn<FileObject>[] = useMemo(
        () => [
            {
                key: 'select',
                width: '44px',
                header: (
                    <FileActionCheckbox
                        type={'checkbox'}
                        aria-label={'Select every file'}
                        checked={selectedFilesLength === (files?.length === 0 ? -1 : files?.length)}
                        onChange={onSelectAllClick}
                    />
                ),
                render: (file) => (
                    <Standalone>
                        <SelectFileCheckbox name={file.name} />
                    </Standalone>
                ),
            },
            {
                key: 'name',
                header: 'Name',
                render: (file) => <FileName file={file} />,
            },
            {
                key: 'size',
                header: 'Size',
                align: 'right',
                width: '120px',
                render: (file) => (file.isFile ? bytesToString(file.size) : ''),
            },
            {
                key: 'modified',
                header: 'Modified',
                align: 'right',
                width: '200px',
                render: (file) => <span title={file.modifiedAt.toString()}>{modified(file)}</span>,
            },
            {
                key: 'actions',
                header: '',
                align: 'right',
                width: '56px',
                render: (file) => (
                    <Standalone>
                        <FileDropdownMenu file={file} />
                    </Standalone>
                ),
            },
        ],
        [files, selectedFilesLength]
    );

    if (error) {
        return <ServerError message={httpErrorToHuman(error)} onRetry={() => mutate()} />;
    }

    return (
        <ServerContentBlock
            title={'File Manager'}
            eyebrow={'Server'}
            heading={'Files'}
            showFlashKey={'files'}
            actions={
                <Can action={'file.create'}>
                    <NewDirectoryButton />
                    <UploadButton />
                    <NavLink to={`/server/${id}/files/new${window.location.hash}`}>
                        <Button variant={'contained'}>New File</Button>
                    </NavLink>
                </Can>
            }
        >
            <ErrorBoundary>
                <Toolbar>
                    <FileManagerBreadcrumbs />
                    <Toolbar.Spacer />
                    <MassActionsBar />
                    <Can action={'file.create'}>
                        <FileManagerStatus />
                    </Can>
                </Toolbar>
            </ErrorBoundary>
            {!files ? (
                <Spinner size={'large'} centered />
            ) : (
                <>
                    {files.length > LIMIT && (
                        <Alert tone={'waiting'} icon={ExclamationIcon}>
                            This directory is too large to display in the browser, limiting the output to the first{' '}
                            {LIMIT} files.
                        </Alert>
                    )}
                    <Card flush>
                        <DataTable
                            columns={columns}
                            rows={sortFiles(files.slice(0, LIMIT))}
                            keyOf={(file) => file.key}
                            onRowClick={onRowClick}
                            empty={'This directory seems to be empty.'}
                            mobile={{
                                title: (file) => file.name,
                                subtitle: (file) => modified(file),
                                kpis: (file) =>
                                    file.isFile ? [{ label: 'Size', value: bytesToString(file.size) }] : [],
                            }}
                        />
                    </Card>
                </>
            )}
        </ServerContentBlock>
    );
};
