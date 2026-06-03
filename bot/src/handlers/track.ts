import { Composer } from "grammy";
import { getTrack, getTokenIdForIp, fetchTrackMetadata, formatTrackEntry } from "../queries.js";
import type { BotContext } from "../types.js";

const composer = new Composer<BotContext>();

composer.command("track", async (ctx) => {
  const input = ctx.match?.trim();
  if (!input) {
    await ctx.reply(
      "Usage: `/track <ipId or tokenId>`\n\n" +
      "Show detailed info for a specific track\\.\n" +
      "Example: `/track 0x1234...` or `/track 1`",
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  try {
    let tokenId: bigint;
    if (input.startsWith("0x") || input.startsWith("0X")) {
      tokenId = await getTokenIdForIp(input as `0x${string}`);
    } else {
      tokenId = BigInt(input);
    }

    const track = await getTrack(tokenId);
    const meta = await fetchTrackMetadata(track.metadataURI);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://audiorails.vercel.app";

    const kb = {
      inline_keyboard: [
        [{ text: "🔗 View on Web", url: `${baseUrl}/track/${track.ipId}` }],
        [{ text: "💰 Mint License", url: `${baseUrl}/track/${track.ipId}` }],
      ],
    };

    await ctx.reply(await formatTrackEntry(track, meta), {
      parse_mode: "MarkdownV2",
      link_preview_options: { is_disabled: true },
      reply_markup: kb,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[track] Error:", err);
    await ctx.reply(
      `❌ Could not find that track\\. Make sure the ID is correct\\.\n\n` +
      `Tip: Use /browse to list tracks or /search to find by name\\.`
    );
  }
});

export default composer;
