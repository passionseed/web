"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DmMessageBubble } from "@/components/admin/DmMessageBubble";
import { DmLeadReplyForm } from "@/components/admin/DmLeadReplyForm";
import { replyToLead } from "@/app/admin/dm-leads/actions";
import { refreshAdminCounts } from "@/components/admin/console/live-counts";
import { uploadDmAttachment } from "@/lib/dm-leads/upload-image-client";
import type { MetaAttachmentType } from "@/lib/meta/graph";
import type { DmConversation, DmMessage } from "@/types/dm-leads";

function guessAttachmentKind(file: File): MetaAttachmentType {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

export function DmLeadConversation({ conversation }: { conversation: DmConversation }) {
  const [body, setBody] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState<DmMessage[]>(conversation.dm_messages ?? []);

  useEffect(() => {
    setMessages(conversation.dm_messages ?? []);
  }, [conversation.dm_messages]);

  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, message: DmMessage) => [...state, message]
  );

  const handleSend = (pendingFile: File | null) => {
    const text = body.trim();
    if (!text && !pendingFile) return;
    setError(null);

    const kind = pendingFile ? guessAttachmentKind(pendingFile) : null;
    const optimisticMessage: DmMessage = {
      id: `optimistic-${Date.now()}`,
      conversation_id: conversation.id,
      direction: "outbound",
      sender_type: "admin",
      body: pendingFile ? text || `[${kind}]` : text,
      platform_message_id: null,
      message_type: pendingFile ? "attachment" : "text",
      metadata: {},
      send_status: "pending",
      delivered_at: null,
      read_at: null,
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      ...(pendingFile && {
        dm_message_attachments: [
          {
            id: `optimistic-att-${Date.now()}`,
            message_id: `optimistic-${Date.now()}`,
            attachment_type: kind!,
            position: 0,
            source_url: URL.createObjectURL(pendingFile),
            title: pendingFile.name,
            payload: {},
            created_at: new Date().toISOString(),
          },
        ],
      }),
    };

    setBody("");
    setAttachedFile(null);
    startTransition(async () => {
      addOptimisticMessage(optimisticMessage);

      let attachmentUrl: string | undefined;
      let attachmentType: MetaAttachmentType | undefined;
      if (pendingFile) {
        const uploaded = await uploadDmAttachment(pendingFile, conversation.id);
        if (!uploaded.ok) {
          setError(uploaded.error);
          setBody(text);
          setAttachedFile(pendingFile);
          return;
        }
        attachmentUrl = uploaded.url;
        attachmentType = uploaded.attachmentType;
      }

      const result = await replyToLead(conversation.id, text, attachmentUrl, attachmentType);
      if (!result.ok) {
        setError(result.error);
        setBody(text);
        setAttachedFile(pendingFile);
      } else {
        refreshAdminCounts();
      }
    });
  };

  return (
    <>
      <Card>
        <CardContent className="space-y-3 pt-6">
          {optimisticMessages.map((message) => (
            <DmMessageBubble key={message.id} message={message} />
          ))}
        </CardContent>
      </Card>

      <DmLeadReplyForm
        conversation={conversation}
        body={body}
        onBodyChange={setBody}
        attachedFile={attachedFile}
        onAttachedFileChange={setAttachedFile}
        onSend={handleSend}
        isPending={isPending}
        error={error}
      />
    </>
  );
}
