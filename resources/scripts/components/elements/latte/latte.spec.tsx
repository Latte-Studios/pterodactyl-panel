/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import Alert from './Alert';
import Avatar, { initials } from './Avatar';
import Button from './Button';
import Card from './Card';
import CopyChip from './CopyChip';
import DataTable from './DataTable';
import Dialog from './Dialog';
import PageHeader from './PageHeader';
import StatCard from './StatCard';
import StatusChip from './StatusChip';
import Switch from './Switch';
import Toolbar from './Toolbar';
import { Field, Input } from './Input';
import { backupTone, nodeTone, scheduleTone, serverTone, subuserTone } from './status';
import { ThemeWrapper, themes } from './themes';

jest.mock('copy-to-clipboard', () => jest.fn());

// Dialog renders through the portal target the panel puts in its blade layout.
beforeAll(() => {
    const portal = document.createElement('div');

    portal.id = 'modal-portal';
    document.body.appendChild(portal);
});

const renderInThemes = (element: React.ReactElement, assert: (container: HTMLElement) => void) => {
    themes.forEach(theme => {
        const { container, unmount } = render(<ThemeWrapper theme={theme}>{element}</ThemeWrapper>);

        assert(container.firstElementChild as HTMLElement);
        unmount();
    });
};

describe('Button', () => {
    it.each(['contained', 'outline', 'text', 'danger'] as const)('renders the %s variant', variant => {
        renderInThemes(<Button variant={variant}>Start</Button>, container => {
            expect(within(container).getByRole('button', { name: 'Start' })).toBeInTheDocument();
        });
    });

    it('defaults to a non-submitting button', () => {
        render(<Button>Start</Button>);

        expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('fires the click handler', () => {
        const onClick = jest.fn();
        render(<Button onClick={onClick}>Start</Button>);

        fireEvent.click(screen.getByRole('button'));

        expect(onClick).toHaveBeenCalledTimes(1);
    });
});

describe('StatusChip', () => {
    it.each(['open', 'progress', 'waiting', 'closed', 'ok', 'bad'] as const)('renders the %s tone', tone => {
        renderInThemes(<StatusChip tone={tone}>Running</StatusChip>, container => {
            expect(within(container).getByText('Running')).toHaveAttribute('data-tone', tone);
        });
    });
});

describe('status tones', () => {
    it('maps the server states from the plan', () => {
        expect(serverTone('running')).toBe('ok');
        expect(serverTone('offline')).toBe('bad');
        expect(serverTone('starting')).toBe('progress');
        expect(serverTone('stopping')).toBe('progress');
        expect(serverTone('installing')).toBe('waiting');
        expect(serverTone('transferring')).toBe('waiting');
        expect(serverTone('restoring_backup')).toBe('waiting');
        expect(serverTone('suspended')).toBe('bad');
        expect(serverTone('node_maintenance')).toBe('waiting');
    });

    it('falls back to bad for an unknown state', () => {
        expect(serverTone('something-else')).toBe('bad');
        expect(serverTone(null)).toBe('bad');
    });

    it('maps the remaining vocabularies', () => {
        expect(backupTone('completed')).toBe('ok');
        expect(backupTone('in_progress')).toBe('progress');
        expect(backupTone('failed')).toBe('bad');
        expect(backupTone('stuck')).toBe('open');
        expect(scheduleTone('active')).toBe('ok');
        expect(scheduleTone('processing')).toBe('progress');
        expect(scheduleTone('inactive')).toBe('closed');
        expect(subuserTone('active')).toBe('ok');
        expect(subuserTone('invited')).toBe('waiting');
        expect(nodeTone('online')).toBe('ok');
        expect(nodeTone('warning')).toBe('waiting');
        expect(nodeTone('critical')).toBe('bad');
        expect(nodeTone('maintenance')).toBe('waiting');
        expect(nodeTone('offline')).toBe('bad');
    });
});

describe('CopyChip', () => {
    it('renders in both themes and copies on click', () => {
        const copy = jest.requireMock('copy-to-clipboard');

        renderInThemes(<CopyChip value={'node-01.latte.gg:25565'} />, container => {
            fireEvent.click(within(container).getByRole('button'));
        });

        expect(copy).toHaveBeenCalledWith('node-01.latte.gg:25565');
        expect(copy).toHaveBeenCalledTimes(themes.length);
    });

    it('shows a label instead of the copied value when one is given', () => {
        render(<CopyChip value={'secret'} label={'API key'} />);

        expect(screen.getByText('API key')).toBeInTheDocument();
    });
});

describe('Card', () => {
    it('renders header, body and footer in both themes', () => {
        renderInThemes(
            <Card title={'Backups'} subtitle={'3 of 5 used'} footer={<Button>Create</Button>}>
                Body
            </Card>,
            container => {
                expect(within(container).getByRole('heading', { name: 'Backups' })).toBeInTheDocument();
                expect(within(container).getByText('3 of 5 used')).toBeInTheDocument();
                expect(within(container).getByText('Body')).toBeInTheDocument();
                expect(within(container).getByRole('button', { name: 'Create' })).toBeInTheDocument();
            },
        );
    });
});

describe('PageHeader', () => {
    it('renders one h1 with an eyebrow above it', () => {
        renderInThemes(
            <PageHeader eyebrow={'Server'} title={'Console'} subtitle={'Survival'} actions={<Button>Start</Button>} />,
            container => {
                expect(within(container).getAllByRole('heading', { level: 1 })).toHaveLength(1);
                expect(within(container).getByRole('heading', { level: 1 })).toHaveTextContent('Console');
                expect(within(container).getByText('Server')).toBeInTheDocument();
            },
        );
    });
});

describe('Toolbar', () => {
    it('marks the active chip as pressed', () => {
        renderInThemes(
            <Toolbar>
                <Toolbar.Chips>
                    <Toolbar.Chip active>Mine</Toolbar.Chip>
                    <Toolbar.Chip>All</Toolbar.Chip>
                </Toolbar.Chips>
            </Toolbar>,
            container => {
                expect(within(container).getByRole('button', { name: 'Mine' })).toHaveAttribute('aria-pressed', 'true');
                expect(within(container).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
            },
        );
    });
});

describe('StatCard', () => {
    it('renders a value with a bar clamped to the track', () => {
        renderInThemes(<StatCard label={'CPU'} value={'42'} unit={'%'} percent={142} tone={'bad'} />, container => {
            const bar = within(container).getByRole('progressbar');

            expect(bar).toHaveAttribute('aria-valuenow', '100');
            expect(bar.firstElementChild).toHaveStyle({ width: '100%' });
        });
    });

    it('leaves the bar out when no percentage is given', () => {
        render(<StatCard label={'Uptime'} value={'3d'} />);

        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
});

describe('Alert', () => {
    it('renders in both themes with its tone exposed', () => {
        renderInThemes(
            <Alert tone={'waiting'} title={'Host under pressure'}>
                Memory is above 90 percent.
            </Alert>,
            container => {
                expect(within(container).getByRole('status')).toHaveAttribute('data-tone', 'waiting');
            },
        );
    });
});

describe('Avatar', () => {
    it('builds initials from one or two names', () => {
        expect(initials('Gabriel Perrett')).toBe('GP');
        expect(initials('paique')).toBe('pa');
        expect(initials('   ')).toBe('?');
    });

    it('gives the same identifier the same colour', () => {
        const { container: first } = render(<Avatar name={'Gabriel Perrett'} identifier={'uuid-1'} />);
        const { container: second } = render(<Avatar name={'Someone Else'} identifier={'uuid-1'} />);

        expect(first.firstElementChild?.className).toBe(second.firstElementChild?.className);
    });
});

describe('Switch', () => {
    it('reports its state and toggles in both themes', () => {
        const onChange = jest.fn();

        renderInThemes(<Switch checked={false} onChange={onChange} label={'Enabled'} />, container => {
            const control = within(container).getByRole('switch');

            expect(control).toHaveAttribute('aria-checked', 'false');
            fireEvent.click(control);
        });

        expect(onChange).toHaveBeenCalledWith(true);
    });
});

describe('Field', () => {
    it('replaces the description with the error while one is present', () => {
        const { rerender } = render(
            <Field label={'Username'} htmlFor={'username'} description={'Used to sign in.'}>
                <Input id={'username'} />
            </Field>,
        );

        expect(screen.getByText('Used to sign in.')).toBeInTheDocument();

        rerender(
            <Field label={'Username'} htmlFor={'username'} description={'Used to sign in.'} error={'Required.'}>
                <Input id={'username'} />
            </Field>,
        );

        expect(screen.queryByText('Used to sign in.')).not.toBeInTheDocument();
        expect(screen.getByText('Required.')).toBeInTheDocument();
    });
});

describe('Dialog', () => {
    it('renders nothing while closed', () => {
        render(
            <Dialog open={false} onClose={jest.fn()} title={'Reinstall'}>
                Body
            </Dialog>,
        );

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes on escape', () => {
        const onClose = jest.fn();
        render(
            <Dialog open onClose={onClose} title={'Reinstall'} description={'This wipes the server files.'}>
                Body
            </Dialog>,
        );

        expect(screen.getByRole('dialog')).toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});

interface Row {
    id: string;
    name: string;
    node: string;
}

const rows: Row[] = [
    { id: 'a', name: 'Survival', node: 'node-01' },
    { id: 'b', name: 'Creative', node: 'node-02' },
];

describe('DataTable', () => {
    const columns = [
        { key: 'name', header: 'Name', render: (row: Row) => row.name },
        { key: 'node', header: 'Node', render: (row: Row) => row.node, align: 'right' as const },
    ];

    it('renders both the table and the list so the layout is a media query away', () => {
        renderInThemes(
            <DataTable
                columns={columns}
                rows={rows}
                keyOf={row => row.id}
                mobile={{
                    title: row => row.name,
                    subtitle: row => row.node,
                    kpis: row => [{ label: 'Node', value: row.node }],
                }}
            />,
            container => {
                expect(within(container).getAllByRole('row')).toHaveLength(rows.length + 1);
                expect(within(container).getAllByText('Survival')).toHaveLength(2);
            },
        );
    });

    it('shows the empty state instead of an empty table', () => {
        render(
            <DataTable
                columns={columns}
                rows={[]}
                keyOf={row => row.id}
                mobile={{ title: row => row.name }}
                empty={'No servers yet.'}
            />,
        );

        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        expect(screen.getByText('No servers yet.')).toBeInTheDocument();
    });

    it('passes the clicked row to the handler', () => {
        const onRowClick = jest.fn();
        render(
            <DataTable
                columns={columns}
                rows={rows}
                keyOf={row => row.id}
                mobile={{ title: row => row.name }}
                onRowClick={onRowClick}
            />,
        );

        fireEvent.click(screen.getAllByRole('row')[1]!);

        expect(onRowClick).toHaveBeenCalledWith(rows[0]);
    });
});
