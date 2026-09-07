import React, { useEffect, useState } from 'react';
import { ServerContext } from '@/state/server';
import { NavLink, useLocation } from 'react-router-dom';
import { encodePathSegments, hashToPath } from '@/helpers';
import styles from './files.module.css';

interface Props {
    withinFileEditor?: boolean;
    isNewFile?: boolean;
}

/** The path reads as a caption above the listing, not as a heading. */
export default ({ withinFileEditor, isNewFile }: Props) => {
    const [file, setFile] = useState<string | null>(null);
    const id = ServerContext.useStoreState((state) => state.server.data!.id);
    const directory = ServerContext.useStoreState((state) => state.files.directory);
    const { hash } = useLocation();

    useEffect(() => {
        const path = hashToPath(hash);

        if (withinFileEditor && !isNewFile) {
            const name = path.split('/').pop() || null;
            setFile(name);
        }
    }, [withinFileEditor, isNewFile, hash]);

    const breadcrumbs = (): { name: string; path?: string }[] =>
        directory
            .split('/')
            .filter((directory) => !!directory)
            .map((directory, index, dirs) => {
                if (!withinFileEditor && index === dirs.length - 1) {
                    return { name: directory };
                }

                return { name: directory, path: `/${dirs.slice(0, index + 1).join('/')}` };
            });

    return (
        <nav aria-label={'Path'} className={styles.breadcrumbs}>
            /<span className={styles.crumbCurrent}>home</span>/
            <NavLink to={`/server/${id}/files`} className={styles.crumb}>
                container
            </NavLink>
            /
            {breadcrumbs().map((crumb, index) =>
                crumb.path ? (
                    <React.Fragment key={index}>
                        <NavLink to={`/server/${id}/files#${encodePathSegments(crumb.path)}`} className={styles.crumb}>
                            {crumb.name}
                        </NavLink>
                        /
                    </React.Fragment>
                ) : (
                    <span key={index} className={styles.crumbCurrent}>
                        {crumb.name}
                    </span>
                )
            )}
            {file && <span className={styles.crumbCurrent}>{file}</span>}
        </nav>
    );
};
