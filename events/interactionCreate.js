const { Events } = require('discord.js');
const roulette = require('../roulette.js');

function noSuchCommand(client, interaction) {
  interaction.editReply({ content: 'No such command', ephemeral: true })
    .catch(err => console.log(err));
}

async function commandInteraction(interaction, client) {
  var command = interaction.commandName;
  var response = '';
  var embed;

  if (!client.commands.has(command)) {
    noSuchCommand(client, interaction);
    return;
  }

  const clientCommand = client.commands.get(command);
  if (!clientCommand.executeInteraction) {
    noSuchCommand(client, interaction);
    return;
  }

  await interaction.deferReply({ ephemeral: clientCommand.ephemeral })

  // Execute command by name from the 'commands/{command.name}.js' file
  try {
    clientCommand.executeInteraction(interaction, client);
  } catch (ex) {
    console.error(ex);
    interaction.editReply(ex);
  }
}

async function componentInteraction(interaction, client) {
  switch (interaction.customId) {
    case 'roulette-join':
      await roulette.join(interaction);
      return;

    case 'roulette-feedback':
      roulette.feedback(interaction);
      break;
      
    case 'roulette-feedback-submit':
      roulette.feedbackSubmit(interaction);
      break;
    
    case 'roulette-problem':
      roulette.problem(interaction);
     break;
    
    default: interaction.reply({ content: 'Unknown interaction', ephemeral: true });
      break;
  }
}

module.exports = {
  name: Events.InteractionCreate,
  execute: async (client, args) => {
    let interaction = args[0]
    if (interaction.isCommand() || interaction.type === 2) {
      commandInteraction(interaction, client);
    }
    
    if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
      componentInteraction(interaction, client);
    }
  }
}