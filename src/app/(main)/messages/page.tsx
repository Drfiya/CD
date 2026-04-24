import { getMessages } from '@/lib/i18n';
import { getUserLanguage } from '@/lib/translation/helpers';

export default async function MessagesIndexPage() {
  let userLanguage: string;
  try {
    userLanguage = await getUserLanguage();
  } catch {
    userLanguage = 'en';
  }
  const messages = getMessages(userLanguage);

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        {messages.dm.selectConversation}
      </p>
    </div>
  );
}
