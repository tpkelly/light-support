const { WebhookClient } = require('discord.js');
const common = require('./common.js');
const config = require('./config.js');

async function join(interaction) {
  var guildConfig = config[interaction.guild.id];
  await interaction.deferReply({ ephemeral: true });
  
  // Check if they already have the role
  if (interaction.member.roles.cache.some(role => role.id == guildConfig.rouletteRole)) {
    interaction.editReply({ embeds: [common.styledEmbed('Roleplay Roulette', ':warning: You are already registered for the next Roleplay Roulette')]});
    return;
  }
  
  
  interaction.member.roles.add(guildConfig.rouletteRole, 'Signed up for Roleplay Roulette');
  interaction.editReply({ embeds: [common.styledEmbed('Roleplay Roulette', 'You have been registered for the next Roleplay Roulette')]});
}

module.exports = {
  join: join
};