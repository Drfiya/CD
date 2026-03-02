import { Suspense } from 'react';
import { Metadata } from 'next';
import { getApiUsageData } from '@/lib/dev-tracker/api-usage-actions';
import { ApiUsageDashboard } from '@/components/admin/dev-tracker/api-usage-dashboard';

export const metadata: Metadata = {
    title: 'API Usage | Admin',
};

async function ApiUsageContent() {
    const data = await getApiUsageData();
    return <ApiUsageDashboard initialData={data} />;
}

export default function ApiUsagePage() {
    return (
        <div className="space-y-6 p-6">
            <Suspense
                fallback={
                    <div className="p-8 text-center text-muted-foreground">
                        Loading API usage data…
                    </div>
                }
            >
                <ApiUsageContent />
            </Suspense>
        </div>
    );
}
