import type { Metadata } from "next";
import { screenContext } from "@/lib/server/page";
import { loadMessagesView } from "@/lib/services/loaders";
import { ChatScreen } from "@/ui/screens/chat-screen";
import { Screen } from "../screen";

export const metadata: Metadata = { title: "Échange" };

export default function ChatPage() {
  return (
    <Screen>
      <Chat />
    </Screen>
  );
}

async function Chat() {
  const { me, repository } = await screenContext();
  return <ChatScreen view={await loadMessagesView(repository, me, new Date().toISOString())} />;
}
