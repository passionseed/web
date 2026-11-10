import {
  pickOption,
  readParam,
  readTextParam,
  readUuidParam,
  withQuery,
  type ParamSource,
} from "@/lib/admin/queue-tools/url";

/**
 * URL state for /admin/line. Client-safe.
 *   ?filter=unanswered  the contact wrote last and still follows the account
 *   ?c=<uuid>           the open chat
 *   ?q=<text>           name search
 */

export const LINE_INBOX_PATH = "/admin/line";

export const LINE_CONTACT_FILTERS = ["all", "unanswered"] as const;
export type LineContactFilter = (typeof LINE_CONTACT_FILTERS)[number];

/** Newest chats the list shows; older ones are reached by searching a name. */
export const LINE_CONTACT_LIST_LIMIT = 300;

export interface LineInboxView {
  /** The open chat, when `c` is a valid id. */
  contactId: string | null;
  /** True when the URL asked for a chat, even an invalid one. */
  contactRequested: boolean;
  q: string;
  filter: LineContactFilter;
}

export function parseLineInboxView(source: ParamSource): LineInboxView {
  return {
    contactId: readUuidParam(source, "c"),
    contactRequested: Boolean(readParam(source, "c")),
    q: readTextParam(source, "q", 100),
    filter: pickOption(readParam(source, "filter"), LINE_CONTACT_FILTERS, "all"),
  };
}

/** Link into the inbox; the default filter and empty values are left out. */
export function lineInboxHref(view: {
  contactId?: string | null;
  q?: string;
  filter?: LineContactFilter;
}): string {
  return withQuery(LINE_INBOX_PATH, {
    filter: view.filter === "all" ? null : view.filter,
    c: view.contactId,
    q: view.q?.trim(),
  });
}
