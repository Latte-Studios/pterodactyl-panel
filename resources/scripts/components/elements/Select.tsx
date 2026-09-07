import styled from 'styled-components/macro';
import tw from 'twin.macro';

interface Props {
    hideDropdownArrow?: boolean;
}

/**
 * The native control is kept as it comes. Replacing the arrow with a background
 * image meant hard coding its colour, and suppressing the appearance detaches
 * the option list from `color-scheme`, which is what decides whether the popup
 * the browser draws is a light one or a dark one.
 */
const Select = styled.select<Props>`
    ${tw`shadow-none block w-full rounded-input border text-sm transition-colors duration-150 ease-linear`};
    height: 40px;
    padding: 0 10px;
    background-color: var(--ls-paper);
    border-color: var(--ls-border-strong);
    color: var(--ls-ink);
    font-family: var(--ls-font);
    color-scheme: inherit;
    /* Tints the highlight the browser draws over the selected option. */
    accent-color: var(--ls-primary);

    &:hover:not(:disabled) {
        border-color: var(--ls-focus);
    }

    &:focus {
        outline: none;
        border-color: var(--ls-focus);
        box-shadow: 0 0 0 2px var(--ls-tint);
    }

    &:disabled {
        background-color: var(--ls-tint);
        color: var(--ls-ink-70);
    }

    & option {
        background-color: var(--ls-paper);
        color: var(--ls-ink);
    }
`;

export default Select;
