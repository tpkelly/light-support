const { Client, IntentsBitField, ChannelType, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.Guilds],
  partials: ['MESSAGE', 'CHANNEL']
});

const auth = require('../auth.json');
const config = require('../config.js');
const common = require('../common.js');

// Fisher-Yates shuffle algorithm
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function generateMatches(guild, guildConfig) {
  if (!guild) {
    return [];
  }
  
  return guild.members.fetch()
    .then(() => guild.roles.fetch(guildConfig.rouletteRole))
    .then(async rouletteRole => {
      if (rouletteRole.members.size < 2) {
        return [];
      }
      
      var matches = shuffleArray(Array.from(rouletteRole.members.keys()));
      
      // Remove the role from people who got matched
      for (const member of rouletteRole.members.values()) {
        await member.roles.remove(rouletteRole);
      }
      
      return matches;
    });
}

async function notifyMatches(guild, guildConfig, matches) {
  if (matches.length == 0) {
    return;
  }
  
  var rouletteChannel = guild.channels.resolve(guildConfig.rouletteChannel);
  
  // We have an odd number, so make the first pair a triple
  if (matches.length % 2 == 1) {
    await setupRouletteChannel(rouletteChannel, [matches.pop(), matches.pop(), matches.pop()]);
  }
  
  while (matches.length > 0) {
    await setupRouletteChannel(rouletteChannel, [matches.pop(), matches.pop()]);
  }
}

async function setupRouletteChannel(parentChannel, roleplayers) {
  await parentChannel.threads.create({
    name: 'Roleplay Roulette',
    type: ChannelType.PrivateThread,
    invitable: false
  }).then(async thread => {
    // Invite the matches together
    for (const player of roleplayers) {
      await thread.members.add(player);
    }
    
    var embed = common.styledEmbed('Roleplay Roulette', 'Welcome to the Roleplay Roulette!\n\nThe aim of the roulette is to match people together and have them organise some roleplay together. It might be a small scene alone, or you might want to meet at one of the many venues to roleplay together there instead.\n\nIt is down to you both to decide when, where and how you want to roleplay. Maybe a fight scene? A small comfortable chat? A chance encounter? Old friends reuniting? Just make sure to do it this month!\n\nIf you have any concerns, or feedback (positive or negative!), use the buttons below to discretely signal for help. Your partner cannot see if you use them, but do make an attempt to roleplay before asking for help.\n\n**And last of all, have fun!**');
    var row = new ActionRowBuilder()
      .addComponents(new ButtonBuilder().setLabel('Issue with my match').setStyle('Danger').setCustomId('roulette-problem'))
      .addComponents(new ButtonBuilder().setLabel('Send us Feedback').setStyle('Primary').setCustomId('roulette-feedback'))
    
    await thread.send({ content: `<@${roleplayers.join('> <@')}>`, embeds: [embed], components: [row] });
  });
}

client.once('ready', async () => {
  console.log(`Roulette Draw task as ${client.user.tag} @ ${new Date().toLocaleString()}!`);
  try {
    for (const guildConfig of config.all) {
      var guild = client.guilds.resolve(guildConfig.id);
      await generateMatches(guild, guildConfig)
        .then(matches => notifyMatches(guild, guildConfig, matches));
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
  }
});

client.login(auth.discord);