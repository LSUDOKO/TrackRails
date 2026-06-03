import { Composer } from "grammy";
import { getTrackIds, getTrack, fetchTrackMetadata, escapeMD } from "../queries.js";
import type { BotContext } from "../types.js";

const composer = new Composer<BotContext>();

composer.command("search", async (ctx) => {
  const query = ctx.match?.trim();
  if (!query) {
    await ctx.reply(
      "Usage: `/search <query>`\n\n" +
      "Search tracks by title or artist name\\.\n" +
      "Example: `/search my track`\n\n" +
      "💡 You can also use inline mode: `@TrackRailsBot search term`",
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  try {
    await ctx.api.sendChatAction(ctx.chat!.id, "typing");

    const ids = await getTrackIds(0, 200);
    const q = query.toLowerCase();
    const matches: { tokenId: string; title: string; artist: string; ipId: string }[] = [];

    for (const id of ids) {
      const track = await getTrack(id);
      const meta = await fetchTrackMetadata(track.metadataURI);
      const title = (meta?.title ?? `Track #${track.tokenId.toString()}`).toLowerCase();
      const artist = (meta?.artist ?? "").toLowerCase();
      const genre = (meta?.genre ?? "").toLowerCase();
      if (title.includes(q) || artist.includes(q) || genre.includes(q)) {
        matches.push({
          tokenId: track.tokenId.toString(),
          title: meta?.title ?? `Track #${track.tokenId.toString()}`,
          artist: meta?.artist ?? "Unknown",
          ipId: track.ipId,
        });
      }
      if (matches.length >= 10) break;
    }

    if (matches.length === 0) {
      await ctx.reply(
        `🔍 No tracks found matching *${escapeMD(query)}*\\.`,
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://audiorails.vercel.app";
    const lines = [
      `🔍 *Search Results*: "${escapeMD(query)}"`,
      `${matches.length} match${matches.length !== 1 ? "es" : ""} found`,
      ``,
      ...matches.map((m, i) =>
        `${i + 1}\\. *${escapeMD(m.title)}* — ${escapeMD(m.artist)}` +
        `\n   \`/track ${m.ipId}\``
      ),
    ];

    await ctx.reply(lines.join("\n"), {
      parse_mode: "MarkdownV2",
      link_preview_options: { is_disabled: true },
    });
  } catch (err) {
    console.error("[search] Error:", err);
    await ctx.reply("❌ Search failed. Please try again.");
  }
});

export default composer;
