const { Client, IntentsBitField, ChannelType, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const { MongoClient } = require('mongodb');
const fs = require('fs');

const client = new Client({
  intents: [IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.Guilds],
  partials: ['MESSAGE', 'CHANNEL']
});

const auth = require('../auth.json');
const config = require('../config.js');
const common = require('../common.js');

async function setupRouletteChannel(parentChannel, roleplayers, config) {
  return parentChannel.threads.create({
    name: 'Roleplay Roulette',
    type: ChannelType.PrivateThread,
    invitable: false
  }).then(async thread => {
    // Invite the matches together
    for (const player of roleplayers) {
      await thread.members.add(player);
      //var member = await parentChannel.guild.members.fetch(player);
      //await member.roles.remove(config.rouletteRole);
    }
    
    var embed = common.styledEmbed('Roleplay Roulette', 'Welcome to the Roleplay Roulette!\n\nThe aim of the roulette is to match people together and have them organise some roleplay together. It might be a small scene alone, or you might want to meet at one of the many venues to roleplay together there instead.\n\nIt is down to you both to decide when, where and how you want to roleplay. Maybe a fight scene? A small comfortable chat? A chance encounter? Old friends reuniting? Just make sure to do it this month! If you are stuck for ideas, try the `/rpdice` bot command for some suggestions.\n\nIf you have any concerns, or feedback (positive or negative!), use the buttons below to discretely signal for help. Your partner cannot see if you use them, but do make an attempt to roleplay before asking for help.\n\n**And last of all, have fun!**');
    var row = new ActionRowBuilder()
      .addComponents(new ButtonBuilder().setLabel('Issue with my match').setStyle('Danger').setCustomId('roulette-problem'))
      .addComponents(new ButtonBuilder().setLabel('Send us Feedback').setStyle('Primary').setCustomId('roulette-feedback'))
    
    await thread.send({ content: `<@${roleplayers.join('> <@')}>`, embeds: [embed], components: [row] });
  });
}

client.once('ready', async () => {
  console.log(`Roulette Draw task as ${client.user.tag} @ ${new Date().toLocaleString()}!`);
  try {
    var guildConfig = config['1153335701186809856'];
    var guild = client.guilds.resolve(guildConfig.id);
    var rouletteChannel = guild.channels.resolve(guildConfig.rouletteChannel);
    await setupRouletteChannel(rouletteChannel, [ '394819685268455424', '176711785544548352' ], guildConfig)
    await setupRouletteChannel(rouletteChannel, [ '422480694250569739', '336446104151392257' ], guildConfig)
    await setupRouletteChannel(rouletteChannel, [ '378888811775655946', '156333653042003968' ], guildConfig)
    await setupRouletteChannel(rouletteChannel, [ '202211403145281536', '163406833493475339' ], guildConfig)
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
  }
});

client.login(auth.discord);