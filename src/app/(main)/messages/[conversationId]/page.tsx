import { notFound } from 'next/navigation';
import { getConversation } from '@/lib/conversation-actions';
import { getBlockStatus } from '@/lib/dm-block-actions';
import { getMessages } from '@/lib/i18n';
import { getUserLanguage } from '@/lib/translation/helpers';
import { ChatWindow } from '@/components/messages/chat-window';

interface ChatPageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { conversationId } = await params;

  const result = await getConversation(conversationId, { limit: 50 });
  if ('error' in result) {
    notFound();
  }

  const blockStatus = await getBlockStatus(result.conversation.otherUser.id);

  let userLanguage: string;
  try {
    userLanguage = await getUserLanguage();
  } catch {
    userLanguage = 'en';
  }
  const messages = getMessages(userLanguage);

  const initialMessages = result.messages.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    body: m.body,
    clientMessageId: m.clientMessageId,
    createdAt: new Date(m.createdAt),
    readAt: m.readAt ? new Date(m.readAt) : null,
    attachmentPath: m.attachmentPath ?? null,
    attachmentMime: m.attachmentMime ?? null,
    attachmentSize: m.attachmentSize ?? null,
    attachmentName: m.attachmentName ?? null,
  }));

  return (
    <ChatWindow
      key={result.conversation.id}
      conversationId={result.conversation.id}
      otherUser={result.conversation.otherUser}
      initialMessages={initialMessages}
      canSend={result.conversation.canSend}
      iBlocked={blockStatus.iBlocked}
      theyBlocked={blockStatus.theyBlocked}
      messages={messages.dm}
    />
  );
}
