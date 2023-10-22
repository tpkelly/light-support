const { WebhookClient, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
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

async function feedback(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('roulette-feedback-submit')
    .setTitle("Roulette Feedback");
   
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('feedback').setStyle(TextInputStyle.Paragraph).setLabel('Feedback').setMaxLength(1500).setRequired(true)))
    
  await interaction.showModal(modal);
}

async function feedbackSubmit(interaction) {
  await interaction.deferUpdate();
  
  var feedback = interaction.fields.getTextInputValue('feedback')
  var guildConfig = config[interaction.guild.id];
  var feedbackChannel = interaction.guild.channels.resolve(guildConfig.notifyChannel);
  
  await feedbackChannel.send({ embeds: [common.styledEmbed(`Roulette Feedback from ${interaction.member.displayName}`, feedback)] });
}

async function problem(interaction) {
  var guildConfig = config[interaction.guild.id];
  var feedbackChannel = interaction.guild.channels.resolve(guildConfig.notifyChannel);
  
  await feedbackChannel.send({ embeds: [common.styledEmbed('Roulette Issue', `<@${interaction.member.id}> is having an issue in <#${interaction.channel.id}> that requires assistance`)] });
}


module.exports = {
  join: join,
  feedback: feedback,
  feedbackSubmit: feedbackSubmit,
  problem: problem
};