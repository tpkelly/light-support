const { ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
const ticket = require('../ticket.js');

module.exports = {
  name: 'ticketclose',
  options:[],
  description: 'Force-close a ticket',
  ephemeral: true,
  guildsCommand: true,
  executeInteraction: async(interaction, client) => {
    await ticket.close(interaction, interaction.channel);
    //return interaction.editReply({ content: `Closing ticket` });
  }
};