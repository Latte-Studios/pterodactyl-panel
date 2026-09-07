import React from 'react';

export interface ShellNavItem {
    to: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    exact?: boolean;
    /** Leaves the client router, for example the Blade admin area. */
    external?: boolean;
}

export interface ShellNavGroup {
    /** Rendered in caps above the group. Omit for the first, unlabelled group. */
    label?: string;
    items: ShellNavItem[];
}
