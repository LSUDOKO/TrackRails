import { Composer } from "grammy";
import { getTracksByOwner, fetchTrackMetadata, shortenAddress, escapeMD } from "../queries.js";
import type { BotContext } from "../types.js";

const composer = new Composer<BotContext>();

composer.command("my", async (ctx) => {
  const input = ctx.match?.trim();
  if (!input) {
    await ctx.reply(
      "Usage: `/my <wallet\\_address>`\n\n" +
      "Shows your registered tracks\\.\n" +
      "Example: `/my 0x1234...`",
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  if (!input.startsWith("0x") || input.length !== 42) {
    await ctx.reply("❌ Invalid Ethereum address format. Addresses are 42 characters starting with `0x`.");
    return;
  }

  try {
    const address = input.trim() as `0x${string}`;
    const tracks = await getTracksByOwner(address);

    if (tracks.length === 0) {
      await ctx.reply(
        `📭 *No tracks found*\n\n` +
        `Address: \`${escapeMD(address)}\`\n\n` +
        `Upload your first track on the [web app](${
          process.env.NEXT_PUBLIC_SITE_URL ?? "https://audiorails.vercel.app"
        }/upload)\\.`,
        { parse_mode: "MarkdownV2", link_preview_options: { is_disabled: true } }
      );
      return;
    }

    const lines: string[] = [
      `🎵 *Your Tracks*`,
      `👤 \`${shortenAddress(address)}\` — ${tracks.length} track${tracks.length !== 1 ? "s" : ""}`,
      ``,
    ];
    for (let i = 0; i < Math.min(tracks.length, 15); i++) {
      const track = tracks[i];
      const meta = await fetchTrackMetadata(track.metadataURI);
      const title = meta?.title ?? `Track #${track.tokenId.toString()}`;
      lines.push(`${i + 1}\\. *${escapeMD(title)}* \\- #${track.tokenId.toString()}`);
    }

    if (tracks.length > 15) {
      lines.push(``, `…and ${tracks.length - 15} more`);
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://audiorails.vercel.app";
    lines.push(``);
    lines.push(`🔗 [Full Dashboard](${baseUrl}/dashboard)`);
    lines.push(`💡 Use /track <id> for details, /browse to explore`);

    await ctx.reply(lines.join("\n"), {
      parse_mode: "MarkdownV2",
      link_preview_options: { is_disabled: true },
    });
  } catch (err) {
    console.error("[my] Error:", err);
    await ctx.reply("❌ Could not load your tracks. Check the address and try again.");
  }
});

export default composer;
