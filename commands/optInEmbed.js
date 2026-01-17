const optIn = require('../optInRole.js');

module.exports = {
  name: 'optinembed',
  description: 'Shortcut for setting up opt-in publishing',
  guildsCommand: true,
  options:[],
  ephemeral: true,
  executeInteraction: async(interaction) => {
    var channel = interaction.channel;
    await optIn.post(interaction);
    interaction.editReply('Opt-in prompt created');
  }
}