const { ApplicationCommandType } = require('discord.js');
const common = require('../common.js');
const utils = require('../tickets/transcriptUtils.js')

const fs = require('fs');

async function fetchMessagesAfter(message) {
  var messages = [];
  
  // Fetch messages 100 at a time because of discord's API limits
  while (true) {
    var fetchOptions = { limit: 100 };
    if (messages.length) {
      fetchOptions.before = messages[0].id
    };
    
    var batch = Array.from((await message.channel.messages.fetch(fetchOptions)).values())
        .filter(x => x.id >= message.id);
    
    if (!batch.length) {
      break;
    }
    
    messages = batch.reverse().concat(messages);
  }
  
  return messages;
}

async function transcribeMessages(channel, messages) {
  var html = await utils.formatMessages(channel, messages);
  var filename = `${channel.name}-${new Date().toISOString()}.html`
  fs.writeFileSync(`/home/kazenone/deploy/transcripts/${filename}`, html)
  return filename
}

module.exports = {
  name: 'bulkdelete',
  type: ApplicationCommandType.Message,
  guildsCommand: true,
  ephemeral: true,
  description: '',
  executeInteraction: async(interaction, client) => {
    var firstMessage = interaction.targetMessage;
    var allMessages = await fetchMessagesAfter(firstMessage)
    
    var transcript = await transcribeMessages(interaction.channel, allMessages)

    await interaction.channel.bulkDelete(allMessages.length)
    
    // Post to log
    var logChannel = await interaction.guild.channels.fetch('1171907552699764797');
    var embed = common.styledEmbed('Bulk deleted messages', `Deleted ${allMessages.length} messages from <#${interaction.channel.id}>\nLogged as ${transcript}`, 0x74a372);
    await logChannel.send({ embeds: [embed] });
    
    interaction.editReply('Finished');
  }
};