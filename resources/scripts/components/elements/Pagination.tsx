import React from 'react';
import { PaginatedResult } from '@/api/http';
import Button from '@/components/elements/latte/Button';
import { ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/outline';

interface RenderFuncProps<T> {
    items: T[];
    isLastPage: boolean;
    isFirstPage: boolean;
}

interface Props<T> {
    data: PaginatedResult<T>;
    showGoToLast?: boolean;
    showGoToFirst?: boolean;
    onPageSelect: (page: number) => void;
    children: (props: RenderFuncProps<T>) => React.ReactNode;
}

function Pagination<T>({ data: { items, pagination }, onPageSelect, children }: Props<T>) {
    const isFirstPage = pagination.currentPage === 1;
    const isLastPage = pagination.currentPage >= pagination.totalPages;

    const pages = [];

    // Start two spaces before the current page. If that puts us before the starting page default
    // to the first page as the starting point.
    const start = Math.max(pagination.currentPage - 2, 1);
    const end = Math.min(pagination.totalPages, pagination.currentPage + 5);

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    return (
        <>
            {children({ items, isFirstPage, isLastPage })}
            {pages.length > 1 && (
                <div className={'mt-4 flex justify-center gap-2'}>
                    {pages[0] > 1 && !isFirstPage && (
                        <Button iconOnly size={'small'} aria-label={'First page'} onClick={() => onPageSelect(1)}>
                            <ChevronDoubleLeftIcon className={'w-4 h-4'} />
                        </Button>
                    )}
                    {pages.map((i) => (
                        <Button
                            key={`block_page_${i}`}
                            iconOnly
                            size={'small'}
                            variant={pagination.currentPage === i ? 'contained' : 'outline'}
                            aria-current={pagination.currentPage === i ? 'page' : undefined}
                            onClick={() => onPageSelect(i)}
                        >
                            {i}
                        </Button>
                    ))}
                    {pages[4] < pagination.totalPages && !isLastPage && (
                        <Button
                            iconOnly
                            size={'small'}
                            aria-label={'Last page'}
                            onClick={() => onPageSelect(pagination.totalPages)}
                        >
                            <ChevronDoubleRightIcon className={'w-4 h-4'} />
                        </Button>
                    )}
                </div>
            )}
        </>
    );
}

export default Pagination;
