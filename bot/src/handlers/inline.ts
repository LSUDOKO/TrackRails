import { Composer, InlineQueryResultBuilder } from "grammy";
import { getTrackIds, getTrack, fetchTrackMetadata, escapeMD } from "../queries.js";
import type { BotContext } from "../types.js";

const composer = new Composer<BotContext>();

composer.on("inline_query", async (ctx) => {
  const query = ctx.inlineQuery.query.trim().toLowerCase();
  const results: ReturnType<ReturnType<typeof InlineQueryResultBuilder.article>["text"]>[] = [];

  try {
    const ids = await getTrackIds(0, 50);

    interface Match {
      id: string;
      title: string;
      artist: string;
      ipId: string;
      genre?: string;
      tokenId: string;
    }
    const matches: Match[] = [];

    for (const id of ids) {
      const track = await getTrack(id);
      const meta = await fetchTrackMetadata(track.metadataURI);
      const title = (meta?.title ?? `Track #${track.tokenId.toString()}`).toLowerCase();
      const artist = (meta?.artist ?? "").toLowerCase();
      const genre = (meta?.genre ?? "").toLowerCase();

      if (!query || title.includes(query) || artist.includes(query) || genre.includes(query)) {
        matches.push({
          id: track.tokenId.toString(),
          title: meta?.title ?? `Track #${track.tokenId.toString()}`,
          artist: meta?.artist ?? "Unknown",
          ipId: track.ipId,
          genre: meta?.genre,
          tokenId: track.tokenId.toString(),
        });
      }
      if (matches.length >= 10) break;
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://audiorails.vercel.app";

    for (const m of matches) {
      const msg = [
        `🎵 *${escapeMD(m.title)}*`,
        `👤 ${escapeMD(m.artist)}${m.genre ? ` · ${m.genre}` : ""}`,
        `🆔 \`${m.ipId}\``,
        `🔗 [View on Web](${baseUrl}/track/${m.ipId})`,
      ].join("\n");

      results.push(
        InlineQueryResultBuilder
          .article(m.id, m.title, {
            description: `${m.artist}${m.genre ? ` · ${m.genre}` : ""}`,
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔗 View on Web", url: `${baseUrl}/track/${m.ipId}` }],
              ],
            },
          })
          .text(msg, { parse_mode: "MarkdownV2" })
      );
    }

    if (results.length === 0 && query) {
      results.push(
        InlineQueryResultBuilder
          .article("no_results", "No tracks found", {
            description: `No tracks matching "${query}"`,
          })
          .text(`🔍 No tracks found matching "${query}".`)
      );
    }

    await ctx.answerInlineQuery(results, {
      cache_time: query ? 30 : 60,
      is_personal: false,
    });
  } catch (err) {
    console.error("[inline] Error:", err);
    await ctx.answerInlineQuery([]);
  }
});

export default composer;
