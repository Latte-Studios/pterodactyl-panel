import { useCallback } from 'react';
import useWebsocketEvent from '@/plugins/useWebsocketEvent';
import getServerBackups from '@/api/swr/getServerBackups';
import { ServerBackup } from '@/api/server/types';
import { SocketEvent } from '@/components/server/events';

/**
 * Keeps one backup in the list up to date while it finishes. The subscription
 * is per backup uuid, so it lives in a component the list renders once per row
 * rather than in a loop inside the container.
 */
const BackupCompletionListener = ({ backup }: { backup: ServerBackup }) => {
    const { mutate } = getServerBackups();

    const handler = useCallback(
        (data: string) => {
            try {
                const parsed = JSON.parse(data);

                mutate(
                    current => ({
                        ...current,
                        items: current.items.map(b =>
                            b.uuid !== backup.uuid
                                ? b
                                : {
                                      ...b,
                                      isSuccessful: parsed.is_successful || true,
                                      checksum: (parsed.checksum_type || '') + ':' + (parsed.checksum || ''),
                                      bytes: parsed.file_size || 0,
                                      completedAt: new Date(),
                                  },
                        ),
                    }),
                    false,
                );
            } catch (e) {
                console.warn(e);
            }
        },
        [backup.uuid, mutate],
    );

    useWebsocketEvent(`${SocketEvent.BACKUP_COMPLETED}:${backup.uuid}` as SocketEvent, handler);

    return null;
};

export default BackupCompletionListener;
