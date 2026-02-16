const { Events } = require('discord.js');

module.exports = {
  name: Events.MessageCreate,
  execute: async (client, args) => {
    let message = args[0];
    
    // Ignore DMs and threads
    if (!message.inGuild()) {
      return;
    }
    
    // Only look at announcement channels
    if (!message.crosspostable) {
      return;
    }
    
    // Does not have the opt-in role
    if (!message.member.roles.cache.some(role => role.id == '1462131265682542743')) {
      return;
    }
    
    await message.crosspost().catch(console.error);
  }
}