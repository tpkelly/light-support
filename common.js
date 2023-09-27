const { WebhookClient } = require('discord.js');

function styledEmbed(title, description, colour) {
  return {
      title: title,
      description: description,
      color: colour || 0xde153a,
      footer: {
        text: 'Light RPC'
        //iconURL: 'https://cdn.discordapp.com/icons/1122673195825246318/9b19ece856f1240b612e116a94395780.png'
      }
    }
}

function sendHook(hookId, hookToken, messageData) {
  var hook = new WebhookClient({ id: hookId, token: hookToken });
  setTimeout(() => hook.destroy(), 10000);
  return hook.send(messageData).catch(err => console.error(err));
}

module.exports = {
  styledEmbed: styledEmbed,
  sendHook: sendHook
};