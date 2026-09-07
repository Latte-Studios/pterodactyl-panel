import React, { memo, useState } from 'react';
import { ServerEggVariable } from '@/api/server/types';
import { usePermissions } from '@/plugins/usePermissions';
import InputSpinner from '@/components/elements/InputSpinner';
import { debounce } from 'debounce';
import updateStartupVariable from '@/api/server/updateStartupVariable';
import useFlash from '@/plugins/useFlash';
import FlashMessageRender from '@/components/FlashMessageRender';
import getServerStartup from '@/api/swr/getServerStartup';
import Select from '@/components/elements/Select';
import isEqual from 'react-fast-compare';
import { ServerContext } from '@/state/server';
import Card from '@/components/elements/latte/Card';
import StatusChip from '@/components/elements/latte/StatusChip';
import Switch from '@/components/elements/latte/Switch';
import { Input } from '@/components/elements/latte/Input';
import styles from './startup.module.css';

interface Props {
    variable: ServerEggVariable;
}

const VariableBox = ({ variable }: Props) => {
    const FLASH_KEY = `server:startup:${variable.envVariable}`;

    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);
    const [loading, setLoading] = useState(false);
    const [canEdit] = usePermissions(['startup.update']);
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const { mutate } = getServerStartup(uuid);

    const setVariableValue = debounce((value: string) => {
        setLoading(true);
        clearFlashes(FLASH_KEY);

        updateStartupVariable(uuid, variable.envVariable, value)
            .then(([response, invocation]) =>
                mutate(
                    data => ({
                        ...data,
                        invocation,
                        variables: (data.variables || []).map(v =>
                            v.envVariable === response.envVariable ? response : v,
                        ),
                    }),
                    false,
                ),
            )
            .catch(error => {
                console.error(error);
                clearAndAddHttpError({ error, key: FLASH_KEY });
            })
            .then(() => setLoading(false));
    }, 500);

    const useSwitch = variable.rules.some(
        v => v === 'boolean' || v === 'in:0,1' || v === 'in:1,0' || v === 'in:true,false' || v === 'in:false,true',
    );
    const isStringSwitch = variable.rules.some(v => v === 'string');
    const selectValues = variable.rules.find(v => v.startsWith('in:'))?.split(',') || [];
    const editable = canEdit && variable.isEditable;
    const checked = isStringSwitch ? variable.serverValue === 'true' : variable.serverValue === '1';

    return (
        <Card
            title={variable.name}
            actions={!variable.isEditable ? <StatusChip tone={'closed'}>Read only</StatusChip> : undefined}
        >
            <FlashMessageRender byKey={FLASH_KEY} className={styles.variableFlash} />
            <InputSpinner visible={loading}>
                {useSwitch ? (
                    <Switch
                        disabled={!editable}
                        name={variable.envVariable}
                        checked={checked}
                        onChange={next => {
                            if (!editable) {
                                return;
                            }

                            setVariableValue(isStringSwitch ? String(next) : next ? '1' : '0');
                        }}
                    />
                ) : selectValues.length > 0 ? (
                    <Select
                        onChange={e => setVariableValue(e.target.value)}
                        name={variable.envVariable}
                        defaultValue={variable.serverValue ?? variable.defaultValue}
                        disabled={!editable}
                    >
                        {selectValues.map(selectValue => (
                            <option key={selectValue.replace('in:', '')} value={selectValue.replace('in:', '')}>
                                {selectValue.replace('in:', '')}
                            </option>
                        ))}
                    </Select>
                ) : (
                    <Input
                        onKeyUp={e => {
                            if (editable) {
                                setVariableValue(e.currentTarget.value);
                            }
                        }}
                        readOnly={!editable}
                        name={variable.envVariable}
                        defaultValue={variable.serverValue ?? ''}
                        placeholder={variable.defaultValue}
                    />
                )}
            </InputSpinner>
            <p className={styles.variableDescription}>{variable.description}</p>
        </Card>
    );
};

export default memo(VariableBox, isEqual);
