import React from 'react';
import Card from '@/components/elements/latte/Card';
import styles from './cheatsheet.module.css';

const examples: [string, string][] = [
    ['*/5 * * * *', 'every 5 minutes'],
    ['0 */1 * * *', 'every hour'],
    ['0 8-12 * * *', 'hour range'],
    ['0 0 * * *', 'once a day'],
    ['0 0 * * MON', 'every Monday'],
];

const characters: [string, string][] = [
    ['*', 'any value'],
    [',', 'value list separator'],
    ['-', 'range values'],
    ['/', 'step values'],
];

const Rows = ({ rows }: { rows: [string, string][] }) => (
    <dl className={styles.rows}>
        {rows.map(([expression, meaning]) => (
            <div key={expression} className={styles.row}>
                <dt className={styles.expression}>{expression}</dt>
                <dd className={styles.meaning}>{meaning}</dd>
            </div>
        ))}
    </dl>
);

export default () => (
    <div className={styles.cheatsheet}>
        <Card title={'Examples'}>
            <Rows rows={examples} />
        </Card>
        <Card title={'Special characters'}>
            <Rows rows={characters} />
        </Card>
    </div>
);
