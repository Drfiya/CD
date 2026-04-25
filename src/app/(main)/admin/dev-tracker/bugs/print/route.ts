/**
 * CR14 — Bug Reports PDF Export (HTML Route)
 *
 * Returns a print-optimised HTML page containing all Open + In Progress bugs,
 * with signed screenshot URLs embedded. Admins can use Cmd+P / browser print
 * to export to PDF.
 *
 * Auth: requireAdmin() → 403 for non-admins.
 * No new dependencies — plain HTML string response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import { getBugReportsForPrint } from '@/lib/bug-reporter-actions';

const STATUS_LABELS: Record<string, string> = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
};

const PRIORITY_COLORS: Record<string, string> = {
    P1: '#dc2626',
    P2: '#ea580c',
    P3: '#ca8a04',
    P4: '#6b7280',
};

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));
}

export async function GET(request: NextRequest) {
    void request;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !canEditSettings(session.user.role)) {
        return new NextResponse('<h1>403 Forbidden</h1><p>Admin access required.</p>', {
            status: 403,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
    }

    const reports = await getBugReportsForPrint();

    const rows = reports
        .map((bug) => {
            const priorityColor = PRIORITY_COLORS[bug.priority] ?? '#6b7280';
            const screenshots = bug.screenshots
                .map((s) => {
                    if (!s.signedUrl) return '';
                    if (s.mime.startsWith('image/')) {
                        return `<div style="margin:4px 0;"><img src="${escapeHtml(s.signedUrl)}" alt="${escapeHtml(s.name)}" style="max-width:400px;width:100%;object-fit:contain;border:1px solid #e5e7eb;border-radius:6px;" /></div>`;
                    }
                    return `<a href="${escapeHtml(s.signedUrl)}" target="_blank" style="color:#2563eb;">${escapeHtml(s.name)}</a>`;
                })
                .filter(Boolean)
                .join('\n');

            return `
      <tr>
        <td style="padding:8px 10px;white-space:nowrap;">
          <span style="background:${priorityColor}1a;color:${priorityColor};padding:2px 6px;border-radius:9999px;font-size:11px;font-weight:600;">${escapeHtml(bug.priority)}</span>
        </td>
        <td style="padding:8px 10px;">
          <strong style="display:block;">${escapeHtml(bug.title)}</strong>
          <span style="font-size:11px;color:#6b7280;">${escapeHtml(bug.reproducibility)}</span>
          <p style="margin:4px 0 0;font-size:12px;color:#374151;white-space:pre-wrap;">${escapeHtml(bug.description)}</p>
        </td>
        <td style="padding:8px 10px;font-size:12px;">${escapeHtml(bug.category)}</td>
        <td style="padding:8px 10px;font-size:11px;max-width:160px;word-break:break-all;">${bug.pageUrl ? `<a href="${escapeHtml(bug.pageUrl)}" style="color:#2563eb;">${escapeHtml(bug.pageUrl)}</a>` : '—'}</td>
        <td style="padding:8px 10px;white-space:nowrap;font-size:11px;">${escapeHtml(formatDate(bug.createdAt))}</td>
        <td style="padding:8px 10px;font-size:12px;">
          <span style="background:#fef9c3;color:#92400e;padding:2px 6px;border-radius:9999px;font-size:11px;">${escapeHtml(STATUS_LABELS[bug.status] ?? bug.status)}</span>
        </td>
        <td style="padding:8px 10px;font-size:12px;">${escapeHtml(bug.reporter.name ?? '—')}</td>
        <td style="padding:8px 10px;">${screenshots || '<span style="color:#9ca3af;font-size:11px;">none</span>'}</td>
      </tr>`;
        })
        .join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bug Reports — ${new Date().toLocaleDateString('en')}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #111827; margin: 0; padding: 24px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .meta { font-size: 12px; color: #6b7280; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f9fafb; border-bottom: 2px solid #e5e7eb; }
    th { padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; }
    tbody tr { border-bottom: 1px solid #f3f4f6; }
    tbody tr:hover { background: #f9fafb; }
    @media print {
      a[href]::after { content: ''; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <h1>🐛 Bug Reports (Open + In Progress)</h1>
  <p class="meta">Generated ${escapeHtml(new Date().toLocaleString('en'))} · ${reports.length} report${reports.length !== 1 ? 's' : ''}</p>
  ${reports.length === 0 ? '<p style="color:#6b7280;">No open or in-progress bug reports.</p>' : `
  <table>
    <thead>
      <tr>
        <th>Priority</th>
        <th>Title / Description</th>
        <th>Category</th>
        <th>URL</th>
        <th>Reported</th>
        <th>Status</th>
        <th>Reporter</th>
        <th>Screenshots</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>`}
</body>
</html>`;

    return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}
