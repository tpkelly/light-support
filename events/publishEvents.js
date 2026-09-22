const { Events } = require('discord.js');
const auth = require('../auth.json');
const common = require('../common.js');

module.exports = {
  name: Events.ThreadCreate,
  execute: async (client, args) => {
    let channel = args[0];
    
    console.log(`Created new thread: ${channel.id}`)
    
    // Only look at #events-board threads
    if (channel.parentId != '1172943658287386774') {
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 60000))
    
    var firstPost = await channel.fetchStarterMessage();
    
    // Need to split nitro-length messages to post as a bot
    var messageSegments = common.nitroSplit(`Posted from <#${channel.id}>\n${firstPost.content}`);
    messageSegments[messageSegments.length-1].attachments = firstPost.attachments;
    
    for (const msg of messageSegments) {
      common.sendHook(auth.eventsWebhook.id, auth.eventsWebhook.token, msg);
    }
  }
}