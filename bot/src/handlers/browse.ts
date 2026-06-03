import { Composer } from "grammy";
import { getTrackCount, getTrackIds, getTrack, fetchTrackMetadata, escapeMD } from "../queries.js";
import type { BotContext } from "../types.js";

const PAGE_SIZE = 5;
const composer = new Composer<BotContext>();

composer.command("browse", async (ctx) => {
  try {
    ctx.session.browseOffset = 0;
    await sendTrackPage(ctx, 0);
  } catch (err) {
    await ctx.reply("❌ Could not load track catalog. The network may be congested. Try again shortly.");
    console.error("[browse] Error:", err);
  }
});

async function sendTrackPage(ctx: BotContext, offset: number) {
  const trackCount = await getTrackCount();
  const total = Number(trackCount);

  if (total === 0) {
    await ctx.reply(
      "📭 *No tracks registered yet*\n\n" +
      "Be the first \\! Use the [web app](" +
      (process.env.NEXT_PUBLIC_SITE_URL ?? "https://audiorails.vercel.app") +
      "/upload) to upload your track\\.",
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const ids = await getTrackIds(offset, PAGE_SIZE);
  const lines: string[] = [];

  for (let i = 0; i < ids.length; i++) {
    const track = await getTrack(ids[i]);
    const meta = await fetchTrackMetadata(track.metadataURI);
    const num = offset + i + 1;
    const title = meta?.title ?? `Track #${track.tokenId.toString()}`;
    const artist = meta?.artist ?? shortenAddr(track.owner);
    lines.push(`${num}\\. *${escapeMD(title)}* — ${escapeMD(artist)}`);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const keyboard: any[] = [];

  if (totalPages > 1) {
    const row: any[] = [];
    if (offset > 0) {
      row.push({ text: "⬅️ Prev", callback_data: `browse:${Math.max(0, offset - PAGE_SIZE)}` });
    }
    row.push({ text: `📄 ${currentPage}/${totalPages}`, callback_data: "noop" });
    if (offset + PAGE_SIZE < total) {
      row.push({ text: "Next ➡️", callback_data: `browse:${offset + PAGE_SIZE}` });
    }
    keyboard.push(row);
  }

  if (total > PAGE_SIZE) {
    keyboard.push([
      { text: `🔍 Search tracks`, switch_inline_query_current_chat: "" },
    ]);
  }

  const msg = [
    `🎧 *Track Rails \\- Browse*`,
    `Total: ${total} track${total !== 1 ? "s" : ""}`,
    ``,
    ...lines,
  ].join("\n");

  await ctx.reply(msg, {
    parse_mode: "MarkdownV2",
    reply_markup: keyboard.length > 0
      ? { inline_keyboard: keyboard }
      : undefined,
  });
}

function shortenAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

composer.callbackQuery(/^browse:(-?\d+)$/, async (ctx) => {
  const offset = parseInt(ctx.match[1], 10);
  if (offset < 0) {
    await ctx.answerCallbackQuery("Already on the first page.");
    return;
  }
  await ctx.answerCallbackQuery();
  try {
    await sendTrackPage(ctx, offset);
  } catch (err) {
    await ctx.reply("⚠️ Error loading page. Try again.");
    console.error("[browse] Page error:", err);
  }
});

composer.callbackQuery("noop", async (ctx) => {
  await ctx.answerCallbackQuery();
});

export default composer;
