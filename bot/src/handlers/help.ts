import { Composer } from "grammy";
import { escapeMD } from "../queries.js";
import type { BotContext } from "../types.js";

const composer = new Composer<BotContext>();

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://audiorails.vercel.app";

composer.command("start", async (ctx) => {
  const firstName = ctx.from?.first_name ?? "there";
  const lines = [
    `🎵 *Welcome to Track Rails, ${escapeMD(firstName)}\\!*`,
    ``,
    `A Web3 audio platform on *Story Protocol* with *CDR threshold encryption*\\.`,
    `All data is read directly from the blockchain — no mocks, no placeholders\\.`,
    ``,
    `*Commands:*`,
    `‣ /browse — Browse\\/explore registered tracks`,
    `‣ /track \\<id\\> — Detailed track info \\& mint license`,
    `‣ /stats — Platform statistics`,
    `‣ /my \\<address\\> — Your tracks dashboard`,
    `‣ /search \\<query\\> — Find tracks by title or artist`,
    `‣ /help — Show this help`,
    ``,
    `💡 *Inline mode:*`,
    `Type \`@TrackRailsBot <search>\` in any chat to quickly find tracks\\.`,
    ``,
    `🔗 [Open Web App](${SITE_URL})`,
  ];
  await ctx.reply(lines.join("\n"), {
    parse_mode: "MarkdownV2",
    link_preview_options: { is_disabled: true },
  });
});

composer.command("help", async (ctx) => {
  const lines = [
    `📖 *Track Rails Bot \\- Help*`,
    ``,
    `I connect to Story Protocol and read track data directly from the blockchain\\.`,
    `No mock data — everything is real on\\-chain information\\.`,
    ``,
    `*Read commands:*`,
    `‣ /browse — Paginated track catalog with prev\\/next navigation`,
    `‣ /track \\<ipId\\|tokenId\\> — Track details \\& quick actions`,
    `‣ /stats — Total tracks \\& platform overview`,
    `‣ /my \\<address\\> — List tracks owned by a wallet`,
    `‣ /search \\<query\\> — Search by title, artist, or genre`,
    ``,
    `*Inline mode:*`,
    `Type \`@TrackRailsBot artist\\_name\` in any chat to share tracks instantly\\.`,
    ``,
    `*Write actions* \\(upload, mint license, claim revenue\\)`,
    `require a wallet connection — use the [web app](${SITE_URL}) for those\\.`,
    ``,
    `🐛 Found an issue? Report it on [GitHub](${SITE_URL})`,
  ];
  await ctx.reply(lines.join("\n"), {
    parse_mode: "MarkdownV2",
    link_preview_options: { is_disabled: true },
  });
});

export default composer;
