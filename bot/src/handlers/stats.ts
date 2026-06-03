import { Composer } from "grammy";
import { getTrackCount } from "../queries.js";
import type { BotContext } from "../types.js";

const composer = new Composer<BotContext>();

composer.command("stats", async (ctx) => {
  try {
    const trackCount = await getTrackCount();
    const lines = [
      `📊 *Track Rails \\- Platform Stats*`,
      ``,
      `🎵 Tracks registered: **${trackCount.toString()}**`,
      `🌐 Network: Story Aeneid \\(testnet\\)`,
      ``,
      `Commands:`,
      `‣ /browse — Explore tracks`,
      `‣ /track — Track details`,
      `‣ /search — Search by name`,
      `‣ /my — Your uploads`,
    ];
    await ctx.reply(lines.join("\n"), { parse_mode: "MarkdownV2" });
  } catch (err) {
    console.error("[stats] Error:", err);
    await ctx.reply("❌ Could not fetch platform stats. Network may be congested.");
  }
});

export default composer;
