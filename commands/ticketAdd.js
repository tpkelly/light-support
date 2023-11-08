const { ApplicationCommandOptionType } = require('discord.js');
const ticket = require('../ticket.js');

module.exports = {
  name: 'ticketadd',
  description: 'Add a user to an existing ticket',
  guildCommand: true,
  options:[ { type: ApplicationCommandOptionType.User, name: "user", description: "The user to add to the ticket" } ],
  ephemeral: true,
  executeInteraction: async(interaction, client) => {
    if (!ticket.isTicketChannel(interaction.channel)) {
      return interaction.editReply('Command must be run in a ticket');
    }

    var user = interaction.options.getUser('user');
    
    await ticket.addAuthor(interaction.channel, user.id);
    console.log(`Adding ${user.tag} to ${interaction.channel.name}`)
    return interaction.editReply({ content: `Adding ${user.tag} to ${interaction.channel.name}` });
  }
};