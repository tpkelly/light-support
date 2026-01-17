const { ActionRowBuilder, ButtonBuilder } = require('discord.js');
const common = require('./common.js');
const roleId = '1462131265682542743';

async function post(interaction) {
  var embed = common.styledEmbed('Opt-in Publishing', 'If you want your posts to be automatically published to other servers, press the button below to receive the necessary role');
  var row = new ActionRowBuilder()
    .addComponents(new ButtonBuilder().setLabel('Opt-in/out').setStyle('Primary').setCustomId('opt-in-toggle').setEmoji('📢'))
    
  await interaction.channel.send({
    embeds: [embed],
    components: [row]
  });
}

async function toggle(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  if (interaction.member.roles.cache.some(role => role.id == roleId)) {
    await interaction.member.roles.remove(roleId);
    await interaction.editReply({ content: 'Role removed. Your venue posts will no longer be automatically cross-posted.' });
  }
  else {
    await interaction.member.roles.add(roleId);
    await interaction.editReply({ content: 'Role assigned. Your venue posts will be automatically cross-posted.' });
  }
}

module.exports = {
  toggle: toggle,
  post: post
};