const { Client, IntentsBitField, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.Guilds],
  partials: ['MESSAGE', 'CHANNEL']
});

const auth = require('../auth.json');
const config = require('../config.js');
const common = require('../common.js');

client.once('ready', async () => {
  console.log(`Roulette Setup task as ${client.user.tag} @ ${new Date().toLocaleString()}!`);
  try {
    for (const guildConfig of config.all) {
      var guild = client.guilds.resolve(guildConfig.id);
      if (!guild) {
        continue;
      }
      
      var rouletteChannel = guild.channels.resolve(guildConfig.rouletteChannel);
      
      embed = common.styledEmbed('Roleplay Roulette', "It's that time again! If you want to enter into the next Roleplay Roulette, hit the button below to register.\n\nIf you've never seen the Roulette before, each month we pair up all our participants and encourage them to organise a small Roleplay scene between themselves - Whenever, wherever and however they want. As long as both of them are happy with it, anything goes!");
      var row = new ActionRowBuilder()
        .addComponents(new ButtonBuilder().setLabel('Register').setStyle('Primary').setCustomId('roulette-join'))
    
      await rouletteChannel.send({ content: '<@&1169583360847400960>', embeds: [embed], components: [row] });
    }
  } finally {
    client.destroy();
  }
});

client.login(auth.discord);