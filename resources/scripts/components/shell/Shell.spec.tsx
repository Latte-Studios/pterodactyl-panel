/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StoreProvider } from 'easy-peasy';
import { CogIcon, TerminalIcon } from '@heroicons/react/outline';
import { store } from '@/state';
import { ThemeWrapper, themes } from '@/components/elements/latte/themes';

// Both reach styled-components/macro, which needs babel and so cannot be
// compiled by ts-jest. Neither is part of what this spec checks.
jest.mock('@/components/elements/SpinnerOverlay', () => () => null);
jest.mock('@/components/dashboard/search/SearchModal', () => () => null);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Shell = require('./Shell').default;

const groups = [
    { items: [{ to: '/', label: 'Dashboard', icon: TerminalIcon, exact: true }] },
    { label: 'Configure', items: [{ to: '/account', label: 'Account', icon: CogIcon }] },
];

const renderShell = (theme: 'light' | 'dark') =>
    render(
        <ThemeWrapper theme={theme}>
            <StoreProvider store={store}>
                <MemoryRouter initialEntries={['/']}>
                    <Shell groups={groups} subnav={groups[1]!.items}>
                        Screen
                    </Shell>
                </MemoryRouter>
            </StoreProvider>
        </ThemeWrapper>
    );

beforeAll(() => {
    store.getActions().settings.setSettings({ name: 'Latte' } as never);
    store.getActions().user.setUserData({
        uuid: 'uuid-1',
        username: 'paique',
        email: 'paique@latte.gg',
        language: 'en',
        rootAdmin: true,
        useTotp: false,
        googleEmail: null,
        googleLinkedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
});

describe('Shell', () => {
    it.each(themes)('renders the navigation and the screen under the %s theme', (theme) => {
        const { container, unmount } = renderShell(theme);
        const shell = container.firstElementChild as HTMLElement;

        expect(within(shell).getByRole('link', { name: /Dashboard/ })).toHaveAttribute('href', '/');
        expect(within(shell).getByText('Configure')).toBeInTheDocument();
        expect(within(shell).getByText('Screen')).toBeInTheDocument();

        unmount();
    });

    it('carries the theme toggle, the search and the sign out in the footer', () => {
        renderShell('light');

        expect(screen.getByLabelText('Search servers')).toBeInTheDocument();
        expect(screen.getByLabelText(/Switch to the (light|dark) theme/)).toBeInTheDocument();
        expect(screen.getByLabelText('Sign out')).toBeInTheDocument();
    });

    it('starts with the drawer closed', () => {
        renderShell('light');

        expect(screen.getByLabelText('Open the menu')).toHaveAttribute('aria-expanded', 'false');
    });
});
