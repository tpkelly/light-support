const common = require('../common.js');
const auth = require('../auth.json');

function findHeader(data, header) {
  var headerIndex = data.indexOf(header)
  if (headerIndex > 0) {
    headerIndex += header.length + 7;
    var length = data.charCodeAt(header.length + 6) - 96
    var headerValue = data.slice(headerIndex, headerIndex + length);
    return headerValue;
  }
  else {
    return false
  }
}

module.exports = {
  name: 'messageCreate',
  execute: async (client, args) => {
    var message = args[0];
    await message.fetch()
    
    for (const file of message.attachments.values()) {
      await fetch(file.attachment)
        .then(async res => {
          var contents = await res.text();
          var data = contents.slice(0,1000);
          var modelName = findHeader(data, 'claim_generator_info');
          var agentName = findHeader(data, 'createdmsoftwareAgent');
          if (modelName) {
            var reply = `Model Name: ${modelName}\nAgent Name: ${agentName}\nhttps://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`
            common.sendHook(auth.staffWebhook.id, auth.staffWebhook.token, reply);
          }
        });
    };
  }
}