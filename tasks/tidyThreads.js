const { Client, IntentsBitField, ChannelType } = require('discord.js');

const client = new Client({
  intents: [IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.Guilds],
  partials: ['MESSAGE', 'CHANNEL']
});

const auth = require('../auth.json');
const config = require('../config.js');

async function* findOldThreads(guild) {
  for (var channel of guild.channels.cache.values()) {
    if (channel.type != ChannelType.PublicThread && channel.type != ChannelType.PrivateThread) {
      continue;
    }
    
    if (channel.parent.type != ChannelType.GuildText) { // Ignore forums etc.
      continue;
    }
    
    if (channel.locked) {
      continue;
    }
    
    if (channel.id == '1417569730595786816') { // The rare persistent thread
      continue;
    }

    try {
      var lastMessage = await channel.messages.fetch(channel.lastMessageId);
      var archivedDaysAgo = Math.floor((Date.now() - lastMessage.createdTimestamp) / (1000 * 60 * 60 * 24))
      if (archivedDaysAgo < 14) {
        continue;
      }
      
      yield channel;
    } catch { /* Ignore */ }
  }
}

client.once('ready', async () => {
  console.log(`Thread Tidy task as ${client.user.tag} @ ${new Date().toLocaleString()}!`);
  try {
    var guild = client.guilds.resolve(config.all[1].id);
   
    for await (var thread of findOldThreads(guild)) {
      thread.archived = true;
      thread.setLocked(true);
      console.log(`Locking #${thread.parent.name}: $${thread.name}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
  }
});

client.login(auth.discord);