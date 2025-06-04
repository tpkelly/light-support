const { Events } = require('discord.js');

module.exports = {
  name: Events.MessageCreate,
  execute: async (client, args) => {
    let message = args[0];
    
    // Ignore DMs and threads
    if (!message.inGuild()) {
      return;
    }
    
    // Only look at venue postings
    if (message.channel.id != '1153338619977797682') {
      return;
    }
    
    if (!message.crosspostable) {
      return;
    }
    
    await message.crosspost().catch(console.error);
  }
}