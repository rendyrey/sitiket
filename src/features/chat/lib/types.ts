/** An image the assistant attached to its reply (e.g. merch photos). */
export interface ChatAttachment {
  /** Only images are produced today. */
  type: "image";
  /** Backend-relative asset path — resolve with `toAssetUrl`. Example: `"/uploads/merch/7f3c….webp"` */
  url: string;
  /** Shown under the image. Example: `"Kaos Jazz — Rp120.000"` */
  caption: string;
}

/** Response of `POST /api/chat/messages`. */
export interface ChatReply {
  /** Assistant text, WhatsApp-style formatting (`*bold*`, `- ` lists, bare URLs). */
  reply: string;
  attachments: ChatAttachment[];
  /** Whether the backend treated this message as coming from a signed-in account. */
  signedIn: boolean;
}

/** One bubble in the chat panel. */
export interface ChatEntry {
  /** Stable React key. Example: `"u-1790000000000"` */
  id: string;
  role: "user" | "assistant";
  text: string;
  attachments?: ChatAttachment[];
  /** True for a failed send shown as an assistant-side error bubble. */
  isError?: boolean;
}
