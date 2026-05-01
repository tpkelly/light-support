const { ApplicationCommandOptionType } = require('discord.js');
const common = require('../common.js');

module.exports = {
  name: 'lastten',
  guildsCommand: true,
  ephemeral: true,
  options:[{ type: ApplicationCommandOptionType.Integer, name: "count", description: "Number of messages to remove", required: false }],
  description: 'Remove last few messages',
  executeInteraction: async(interaction, client) => {
    var count = interaction.options.getInteger('count') ?? 10;
    interaction.channel.bulkDelete(count)
    interaction.editReply('Finished');
  }
};