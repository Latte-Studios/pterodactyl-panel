import React from 'react';
import classNames from 'classnames';
import styles from './DataTable.module.css';

export interface DataTableColumn<T> {
    key: string;
    header: React.ReactNode;
    render: (row: T) => React.ReactNode;
    /** Numbers and actions sit on the right. */
    align?: 'left' | 'right';
    width?: string;
}

export interface DataTableMobile<T> {
    title: (row: T) => React.ReactNode;
    subtitle?: (row: T) => React.ReactNode;
    status?: (row: T) => React.ReactNode;
    kpis?: (row: T) => { label: React.ReactNode; value: React.ReactNode }[];
}

export interface DataTableProps<T> {
    columns: DataTableColumn<T>[];
    rows: T[];
    keyOf: (row: T) => string;
    /** Below 640px the table is replaced by this list. */
    mobile: DataTableMobile<T>;
    onRowClick?: (row: T) => void;
    empty?: React.ReactNode;
    className?: string;
}

const DataTable = <T,>({ columns, rows, keyOf, mobile, onRowClick, empty, className }: DataTableProps<T>) => {
    if (rows.length === 0) {
        return <p className={classNames(styles.empty, className)}>{empty ?? 'Nothing to show here.'}</p>;
    }

    return (
        <div className={classNames(styles.wrapper, className)}>
            <table className={styles.table}>
                <thead className={styles.head}>
                    <tr>
                        {columns.map(column => (
                            <th
                                key={column.key}
                                style={column.width ? { width: column.width } : undefined}
                                className={classNames({ [styles.right]: column.align === 'right' })}
                            >
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(row => (
                        <tr
                            key={keyOf(row)}
                            onClick={onRowClick ? () => onRowClick(row) : undefined}
                            className={classNames(styles.row, { [styles.clickable]: !!onRowClick })}
                        >
                            {columns.map(column => (
                                <td
                                    key={column.key}
                                    className={classNames({ [styles.right]: column.align === 'right' })}
                                >
                                    {column.render(row)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className={styles.list}>
                {rows.map(row => {
                    const kpis = mobile.kpis?.(row) ?? [];

                    return (
                        <button
                            key={keyOf(row)}
                            type={'button'}
                            onClick={onRowClick ? () => onRowClick(row) : undefined}
                            className={styles.item}
                        >
                            <span className={styles.itemMain}>
                                <span className={styles.itemTitle}>{mobile.title(row)}</span>
                                {mobile.subtitle && <span className={styles.itemSubtitle}>{mobile.subtitle(row)}</span>}
                                {kpis.length > 0 && (
                                    <span className={styles.kpis}>
                                        {kpis.map((kpi, index) => (
                                            <span key={index} className={styles.kpi}>
                                                <span className={styles.kpiLabel}>{kpi.label}</span>
                                                <span className={styles.kpiValue}>{kpi.value}</span>
                                            </span>
                                        ))}
                                    </span>
                                )}
                            </span>
                            {mobile.status && <span className={styles.itemStatus}>{mobile.status(row)}</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default DataTable;
