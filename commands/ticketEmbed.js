const { ActionRowBuilder, ButtonBuilder } = require('discord.js');
const config = require('../config.js');

function ticketEmbed(title, description) {
  return {
    title: title,
    description: description,
    color: 0xde153a
  }
}

module.exports = {
  name: 'ticketembed',
  description: 'Shortcut for setting up ticket tool buttons',
  guildsCommand: true,
  options:[],
  ephemeral: true,
  executeInteraction: async(interaction) => {
    var channel = interaction.channel;
    var row = new ActionRowBuilder()

    var guildConfig = config[interaction.guild.id]
    var buttonOptions = guildConfig.styleConfig
    for (const [tag, style] of Object.entries(buttonOptions)) {
      row.addComponents(new ButtonBuilder().setLabel(style.buttonTitle).setStyle('Primary').setCustomId(`ticket-reason-${style.prefix}`).setEmoji(style.emoji))
    }

    interaction.editReply('Button menu created');
    channel.send({
      embeds: [ticketEmbed('Quick Tickets', guildConfig.createTicketBoilerplate)],
      components: [row]
    })
  }
}