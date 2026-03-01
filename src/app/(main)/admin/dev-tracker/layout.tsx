import { DevTrackerNav } from '@/components/admin/dev-tracker/dev-tracker-nav';
import { TeamTimezones } from '@/components/admin/dev-tracker/team-timezones';

export default function DevTrackerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div>
            <div className="flex items-center justify-between px-6 pt-4 -mb-2">
                <DevTrackerNav />
                <TeamTimezones />
            </div>
            {children}
        </div>
    );
}
