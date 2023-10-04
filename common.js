const { WebhookClient } = require('discord.js');

function styledEmbed(title, description, colour) {
  return {
      title: title,
      description: description,
      color: colour || 0xde153a,
      footer: {
        text: 'Light RPC',
        iconURL: 'https://cdn.discordapp.com/attachments/1154346363061030974/1156663427595522094/Funky_little_icon_you_got_there.png'
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