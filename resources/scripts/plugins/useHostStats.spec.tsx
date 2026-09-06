/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, render } from '@testing-library/react';
import useHostStats from '@/plugins/useHostStats';
import useWebsocketEvent from '@/plugins/useWebsocketEvent';
import { SocketEvent } from '@/components/server/events';

let rootAdmin = true;

jest.mock('easy-peasy', () => ({
    useStoreState: (selector: any) => selector({ user: { data: { rootAdmin } } }),
}));

jest.mock('@/plugins/useWebsocketEvent', () => jest.fn());

const mocked = useWebsocketEvent as unknown as jest.Mock;

const snapshot = {
    timestamp: '2026-09-06T21:00:00Z',
    cpu: { threads: 32, percent: 87.4, load: { 1: 28.1, 5: 25, 15: 20.3 }, load_percent: 87.8 },
    memory: { total_bytes: 1024, used_bytes: 512, available_bytes: 512, percent: 50 },
    pressure: { level: 'warning', resources: { cpu: 'warning', memory: 'ok', disk: 'ok' } },
};

const Subject = ({ onRender }: { onRender: (stats: ReturnType<typeof useHostStats>) => void }) => {
    onRender(useHostStats());

    return null;
};

/**
 * Renders the hook and returns both the latest value it produced and the
 * callback it handed to the websocket subscription.
 */
const renderHook = () => {
    const values: ReturnType<typeof useHostStats>[] = [];

    render(<Subject onRender={(stats) => values.push(stats)} />);

    return {
        latest: () => values[values.length - 1],
        emit: (data: string) => act(() => mocked.mock.calls[mocked.mock.calls.length - 1][1](data)),
    };
};

describe('useHostStats.ts', () => {
    beforeEach(() => {
        rootAdmin = true;
        mocked.mockClear();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('does not subscribe for a user that is not an administrator', () => {
        rootAdmin = false;

        const { latest } = renderHook();

        expect(mocked).toHaveBeenCalledWith(SocketEvent.HOST_STATS, expect.any(Function), false);
        expect(latest()).toBeNull();
    });

    it('subscribes for an administrator and exposes the sample', () => {
        const { latest, emit } = renderHook();

        expect(mocked).toHaveBeenCalledWith(SocketEvent.HOST_STATS, expect.any(Function), true);

        emit(JSON.stringify(snapshot));

        expect(latest()?.cpu.percent).toBe(87.4);
    });

    it('ignores a payload it cannot parse', () => {
        const { latest, emit } = renderHook();

        emit('not json');

        expect(latest()).toBeNull();
    });

    it('drops the sample once it goes stale', () => {
        const { latest, emit } = renderHook();

        emit(JSON.stringify(snapshot));
        expect(latest()).not.toBeNull();

        act(() => {
            jest.advanceTimersByTime(9_000);
        });
        expect(latest()).not.toBeNull();

        act(() => {
            jest.advanceTimersByTime(1_000);
        });
        expect(latest()).toBeNull();
    });
});
