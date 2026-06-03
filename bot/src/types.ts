import { type Context, type SessionFlavor } from "grammy";

export interface SessionData {
  browseOffset: number;
}

export type BotContext = Context & SessionFlavor<SessionData>;
