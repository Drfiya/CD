import { DevTrackerNav } from '@/components/admin/dev-tracker/dev-tracker-nav';

export default function DevTrackerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div>
            <DevTrackerNav />
            {children}
        </div>
    );
}
