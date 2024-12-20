const { WebhookClient, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const common = require('./common.js');
const config = require('./config.js');

async function join(interaction) {
  var guildConfig = config[interaction.guild.id];
  await interaction.deferReply({ ephemeral: true });
  
  // Check if they already have the role
  if (interaction.member.roles.cache.some(role => role.id == guildConfig.rouletteRole)) {
    interaction.editReply({ embeds: [common.styledEmbed('Roleplay Roulette', ':warning: You are already registered for the next Roleplay Roulette')]});
    return;
  }
  
  interaction.member.roles.add(guildConfig.rouletteRole, 'Signed up for Roleplay Roulette');
  interaction.editReply({ embeds: [common.styledEmbed('Roleplay Roulette', 'You have been registered for the next Roleplay Roulette')]});
}

async function feedback(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('roulette-feedback-submit')
    .setTitle("Roulette Feedback");
   
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('feedback').setStyle(TextInputStyle.Paragraph).setLabel('Feedback').setMaxLength(1500).setRequired(true)))
    
  await interaction.showModal(modal);
}

async function feedbackSubmit(interaction) {
  await interaction.deferUpdate();
  
  var feedback = interaction.fields.getTextInputValue('feedback')
  var guildConfig = config[interaction.guild.id];
  var feedbackChannel = interaction.guild.channels.resolve(guildConfig.notifyChannel);
  
  await feedbackChannel.send({ embeds: [common.styledEmbed(`Roulette Feedback from ${interaction.member.displayName}`, feedback)] });
}

async function preference(interaction) {
  await interaction.deferUpdate();

  var roleplayer = interaction.member;
  var channel = interaction.channel;
  var value = interaction.values[0]
  
  var collection = interaction.client.mongo.collection('roulette');
  
  // Remove the interactee from all matches
  if (value == 'none') {
    console.log(`${roleplayer.id} removed themselves from the roulette`);
    var doc = await collection.findOne({ _id: roleplayer.id })
    var matches = doc.matches || [];
    for (const id of matches) {
      var otherDoc = await collection.findOne({ _id: id })
      
      if (!otherDoc) {
        continue;
      }
      
      var otherMatches = otherDoc.matches || [];
      await collection.findOneAndUpdate({ _id: id }, { $set: { matches: otherMatches.filter(x => x != roleplayer.id) }});
    }
    
    await collection.deleteOne({ _id: roleplayer.id });
  } else if (value != 'any') {
    try {
      // Remove the interactee from one match
      console.log(`${roleplayer.id} vetoed ${value}`);
      var doc = await collection.findOne({ _id: roleplayer.id })
      var matches = doc.matches || [];
      await collection.findOneAndUpdate({ _id: roleplayer.id }, { $set: { matches: matches.filter(x => x != value) }});
      
      // And the reverse
      doc = await collection.findOne({ _id: value })
      matches = doc.matches || [];
      await collection.findOneAndUpdate({ _id: value }, { $set: { matches: matches.filter(x => x != roleplayer.id) }});
      
    } catch (e) {
      console.error(`Error with removing ${roleplayer.id}: ${e}`);
    }
  } else {
    console.log(`${roleplayer.id} accepted all options`);
  }
  
  // Channel is finished, remove it
  await channel.delete()
  // And remove their role
  var guildConfig = config[interaction.guild.id];
  await roleplayer.roles.remove(guildConfig.rouletteRole);
}

async function problem(interaction) {
  var guildConfig = config[interaction.guild.id];
  var feedbackChannel = interaction.guild.channels.resolve(guildConfig.notifyChannel);
  
  await feedbackChannel.send({ embeds: [common.styledEmbed('Roulette Issue', `<@${interaction.member.id}> is having an issue in <#${interaction.channel.id}> that requires assistance`)] });
}


module.exports = {
  join: join,
  feedback: feedback,
  feedbackSubmit: feedbackSubmit,
  preference: preference,
  problem: problem
};