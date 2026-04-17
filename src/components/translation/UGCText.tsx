/**
 * UGCText — Opt-in wrapper for user-generated content.
 *
 * GlobalTranslator only translates DOM subtrees inside `[data-translate="ugc"]`.
 * Every render site that emits user-authored text (post bodies, comments,
 * profile bios, classroom/event descriptions, etc.) must wrap that text in
 * <UGCText> so the MutationObserver is allowed to reach it.
 *
 * This exists because the allow-list mechanism alone is not enough —
 * without a single canonical wrapper, render-site coverage drifts silently.
 * See academy_memory/feedback/testing_ugc_allowlist_coverage.md.
 */
'use client';

import React from 'react';

type AsTag = 'div' | 'span' | 'p' | 'article' | 'section';

interface UGCTextProps extends React.HTMLAttributes<HTMLElement> {
    as?: AsTag;
    children?: React.ReactNode;
    /**
     * When true and `children` is undefined, renders innerHTML. Use only for
     * already-sanitized rich content (e.g. Tiptap-rendered post bodies).
     */
    html?: string;
}

export function UGCText({
    as = 'div',
    children,
    html,
    ...rest
}: UGCTextProps) {
    const Tag = as as React.ElementType;
    if (html !== undefined) {
        return (
            <Tag
                {...rest}
                data-translate="ugc"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        );
    }
    return (
        <Tag {...rest} data-translate="ugc">
            {children}
        </Tag>
    );
}
