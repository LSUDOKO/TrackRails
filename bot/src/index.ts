import { Bot, session, type Context, type SessionFlavor } from "grammy";
import type { BotContext } from "./types.js";
import browseHandler from "./handlers/browse.js";
import trackHandler from "./handlers/track.js";
import statsHandler from "./handlers/stats.js";
import dashboardHandler from "./handlers/dashboard.js";
import searchHandler from "./handlers/search.js";
import helpHandler from "./handlers/help.js";
import inlineHandler from "./handlers/inline.js";

// ── Session ─────────────────────────────────────────────────────────────
interface SessionData {
  browseOffset: number;
}

function initialSession(): SessionData {
  return { browseOffset: 0 };
}

// ── Bot setup ────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN environment variable is required.");
  console.error("   Set it in .env or pass as BOT_TOKEN=xxx npm start");
  process.exit(1);
}

const bot = new Bot<BotContext>(BOT_TOKEN);

bot.use(session({ initial: initialSession }));

// ── Rate limiting ────────────────────────────────────────────────────────
const cooldowns = new Map<number, number>();
function rateLimit(ctx: BotContext): boolean {
  const now = Date.now();
  const last = cooldowns.get(ctx.from?.id ?? 0) ?? 0;
  if (now - last < 800) return true; // throttled
  cooldowns.set(ctx.from?.id ?? 0, now);
  return false;
}

// ── Typing indicator middleware ──────────────────────────────────────────
async function typingMiddleware(ctx: BotContext, next: () => Promise<void>) {
  if (ctx.chat?.id && (ctx.message?.text?.startsWith("/") || ctx.inlineQuery)) {
    ctx.api.sendChatAction(ctx.chat.id, "typing").catch(() => {});
  }
  await next();
}

bot.use(typingMiddleware);

// ── Group chat guard ─────────────────────────────────────────────────────
bot.use(async (ctx, next) => {
  if (ctx.chat?.type === "group" || ctx.chat?.type === "supergroup") {
    if (ctx.message?.text?.startsWith("/")) {
      await ctx.reply(
        "🤖 I work best in private chat. Message me directly @TrackRailsBot",
        { reply_to_message_id: ctx.message.message_id }
      );
    }
    return;
  }
  await next();
});

// ── Register handlers ────────────────────────────────────────────────────
bot.use(browseHandler);
bot.use(trackHandler);
bot.use(statsHandler);
bot.use(dashboardHandler);
bot.use(searchHandler);
bot.use(helpHandler);
bot.use(inlineHandler);

// ── Fallback ─────────────────────────────────────────────────────────────
bot.on("message:text", async (ctx) => {
  if (rateLimit(ctx)) return;
  const text = ctx.message.text;
  if (text.startsWith("/")) {
    await ctx.reply(
      `❌ Unknown command: \`${text}\`\n` +
      "Use /help to see available commands.",
      { parse_mode: "MarkdownV2" }
    );
  }
});

// ── Error handler ────────────────────────────────────────────────────────
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`❌ Bot error [${ctx?.update?.update_id ?? "?"}]:`, err.error);
  ctx?.reply("⚠️ Something went wrong. Please try again.").catch(() => {});
});

// ── Start ────────────────────────────────────────────────────────────────
const mode = process.env.BOT_MODE ?? "polling";

if (mode === "webhook") {
  const WEBHOOK_URL = process.env.WEBHOOK_URL;
  if (!WEBHOOK_URL) {
    console.error("❌ WEBHOOK_URL required in webhook mode");
    process.exit(1);
  }
  bot.api.setWebhook(WEBHOOK_URL);
  console.log(`🤖 Webhook set to ${WEBHOOK_URL}`);
} else {
  bot.start({
    onStart: (botInfo) => {
      console.log(`🤖 Track Rails Bot is running as @${botInfo.username}`);
      console.log(`   Mode: polling`);
    },
  });
}

process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());
