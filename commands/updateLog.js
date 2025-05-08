const { ApplicationCommandType, ApplicationCommandOptionType, ButtonBuilder, ActionRowBuilder } = require('discord.js');

module.exports = {
  name: 'updatelog',
  type: ApplicationCommandType.Message,
  description: '',
  ephemeral: true,
  guildsCommand: true,
  executeInteraction: async(interaction, client) => {
    var message = interaction.targetMessage;
   
    var buttons = new ActionRowBuilder()
      .addComponents(new ButtonBuilder().setLabel('Download Transcript').setStyle('Secondary').setCustomId('ticket-refresh'))
  
    await message.edit({
      components: [buttons]
    });
    
    await interaction.deleteReply();
  }
};