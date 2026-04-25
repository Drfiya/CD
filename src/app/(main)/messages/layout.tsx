import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConversationList } from '@/lib/conversation-actions';
import { getMessages } from '@/lib/i18n';
import { getUserLanguage } from '@/lib/translation/helpers';
import { ConversationList } from '@/components/messages/conversation-list';
import { MessagesShell } from './messages-shell';

export const metadata = {
  title: 'Messages',
};

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/messages');
  }

  let userLanguage: string;
  try {
    userLanguage = await getUserLanguage();
  } catch {
    userLanguage = 'en';
  }
  const messages = getMessages(userLanguage);

  const initialConversations = await getConversationList();

  return (
    <MessagesShell
      sidebar={
        <div className="h-full flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <h1 className="text-base font-semibold text-foreground">
              {messages.dm.inboxTitle}
            </h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              initialConversations={initialConversations}
              messages={messages.dm}
              locale={userLanguage}
            />
          </div>
        </div>
      }
    >
      {children}
    </MessagesShell>
  );
}
