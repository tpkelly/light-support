const { ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
const ticket = require('../ticket.js');

module.exports = {
  name: 'ticketnew',
  type: ApplicationCommandType.User,
  description: '',
  ephemeral: true,
  guildsCommand: true,
  executeInteraction: async(interaction, client) => {
    var user = interaction.targetUser;
    
    var newTicket = await ticket.createDirect(interaction, interaction.guild, user, 'general');
    return interaction.editReply({ content: `Creating new ticket <#${newTicket.id}> with ${user.tag}` });
  }
};