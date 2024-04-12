const { Client, IntentsBitField, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ThreadAutoArchiveDuration } = require('discord.js');
const { MongoClient } = require('mongodb');
const fs = require('fs');

const client = new Client({
  intents: [IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.Guilds],
  partials: ['MESSAGE', 'CHANNEL']
});

const auth = require('../auth.json');
const config = require('../config.js');
const common = require('../common.js');

// Fisher-Yates shuffle algorithm
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Make sure we're not generating more than 3 matches for the user
function getTripleMatch(matches, set) {
  var match = matches.shift();
  while (set[match].length >= 2) {
    matches.push(match);
    match = matches.shift();
  }
  
  return match;
}

async function generateMatches(guild, guildConfig) {
  if (!guild) {
    return {};
  }
  
  return guild.members.fetch()
    .then(() => guild.roles.fetch(guildConfig.rouletteRole))
    .then(async rouletteRole => {
      if (rouletteRole.members.size < 2) {
        return {};
      }
      
      var matchesSet = Array.from(rouletteRole.members.keys()).reduce((acc, current) => { 
        acc[current] = [];
        return acc;
      }, {});
      
      var matches = shuffleArray(Object.keys(matchesSet).filter(key => matchesSet[key].length < 3));
      while (matches.length > 1) {
        // We have an odd number, so make the first pair a triple
        if (matches.length % 2 == 1 && Object.keys(matchesSet).filter(key => matchesSet[key].length < 2).length > 2) {
          var triple = [getTripleMatch(matches, matchesSet), getTripleMatch(matches, matchesSet), getTripleMatch(matches, matchesSet)];
          matchesSet[triple[0]].push(triple[1], triple[2])
          matchesSet[triple[1]].push(triple[0], triple[2])
          matchesSet[triple[2]].push(triple[0], triple[1])
        }
        
        while (matches.length > 1) {
          var match = [matches.shift(), matches.shift()];
          matchesSet[match[0]].push(match[1])
          matchesSet[match[1]].push(match[0])
        }
        
        matches = shuffleArray(Object.keys(matchesSet).filter(key => matchesSet[key].length < 3))
      }
     
      return matchesSet;
    });
}

function sanityCheck(matches) {
  for (const id of Object.keys(matches)) {
    matches[id] = [...new Set(matches[id])] // Remove duplicates
    matches[id] = matches[id].filter(item => item != id) // Remove self-references
  }
  
  // See if there's anyting we can repair
  var remainder = Object.keys(matches).filter(key => matches[key].length < 3)
  for (var i = 0; i < remainder.length; i++) {
    for (var j = i+1; j < remainder.length; j++) {
      var id = remainder[i];
      var id2 = remainder[j];
      
      if (matches[id].length > 2 || matches[id2].length > 2) {
        continue;
      }
      
      if (matches[id].includes(id2)) {
        continue;
      }
      
      matches[id].push(id2)
      matches[id2].push(id)
    }
  }
  
  // As a last resort, slot Kaze in as a universal match
  remainder = Object.keys(matches).filter(key => matches[key].length < 3)
  for (const id of remainder) {
    matches[id].push('181499334855098379');
  }
  
  return matches;
}

async function notifyMatches(guild, guildConfig, matches) {
  var rouletteChannel = guild.channels.resolve(guildConfig.rouletteChannel);

  // Empty out previous mongo entries
  var mongo = new MongoClient(auth.mongodb).db();
  var collection = mongo.collection('roulette');
  collection.drop();
  
  collection = mongo.collection('roulette');
  
  for (const key of Object.keys(matches)) {
    var options = matches[key]
    await collection.findOneAndUpdate(
      { _id: key },
      { $set: { matches: options } }
    );
  
    await rouletteChannel.threads.create({
      name: 'Roulette Preference',
      type: ChannelType.PrivateThread,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
      invitable: false    
    }).then(async thread => {
      // Invite the roleplayer
      await thread.members.add(key);
      
      var embedText = "Welcome to the Roleplay Pre-Roulette!\n\nBefore we match you with other roleplayers, you have the opportunity to fine-tune your match. You have the choice of 3 other matches, and can either say you are happy with any of them, remove one match from the possibilities, or otherwise decide you aren't feeling the roleplay this month and remove yourself. The matches will begin in 24 hours, and a lack of a reply will be taken as accepting any of the options. Enjoy!\n"
      var selectOptions = new StringSelectMenuBuilder().setPlaceholder('Roleplay Preference').setCustomId('roulette-preference').addOptions(
          new StringSelectMenuOptionBuilder().setLabel('Happy with any').setValue('any'),
          new StringSelectMenuOptionBuilder().setLabel("I don't want to roleplay").setValue('none')
      );

      for (var i = 0; i < options.length; i++) {
        embedText += `\nOption ${i+1}: <@${options[i]}>`
        selectOptions.addOptions(new StringSelectMenuOptionBuilder().setLabel(`Remove Option ${i+1}`).setValue(options[i]));
      }
      
      var embed = common.styledEmbed('Roleplay Roulette', embedText);
     
      var row = new ActionRowBuilder().addComponents(selectOptions);
      await thread.send({ content: `<@${key}>`, embeds: [embed], components: [row] });
    });
  }
}

/*
async function setupRouletteChannel(parentChannel, roleplayers, config) {
  await parentChannel.threads.create({
    name: 'Roleplay Roulette',
    type: ChannelType.PrivateThread,
    invitable: false
  }).then(async thread => {
    // Invite the matches together
    for (const player of roleplayers) {
      await thread.members.add(player);
      var member = await parentChannel.guild.members.fetch(player);
      await member.roles.remove(config.rouletteRole);
    }
    
    var embed = common.styledEmbed('Roleplay Roulette', 'Welcome to the Roleplay Roulette!\n\nThe aim of the roulette is to match people together and have them organise some roleplay together. It might be a small scene alone, or you might want to meet at one of the many venues to roleplay together there instead.\n\nIt is down to you both to decide when, where and how you want to roleplay. Maybe a fight scene? A small comfortable chat? A chance encounter? Old friends reuniting? Just make sure to do it this month! If you are stuck for ideas, try the `/rpdice` bot command for some suggestions.\n\nIf you have any concerns, or feedback (positive or negative!), use the buttons below to discretely signal for help. Your partner cannot see if you use them, but do make an attempt to roleplay before asking for help.\n\n**And last of all, have fun!**');
    var row = new ActionRowBuilder()
      .addComponents(new ButtonBuilder().setLabel('Issue with my match').setStyle('Danger').setCustomId('roulette-problem'))
      .addComponents(new ButtonBuilder().setLabel('Send us Feedback').setStyle('Primary').setCustomId('roulette-feedback'))
    
    await thread.send({ content: `<@${roleplayers.join('> <@')}>`, embeds: [embed], components: [row] });
  });
}
*/

client.once('ready', async () => {
  console.log(`Roulette Filter task as ${client.user.tag} @ ${new Date().toLocaleString()}!`);
  try {
    for (const guildConfig of config.all) {
      var guild = client.guilds.resolve(guildConfig.id);
      await generateMatches(guild, guildConfig)
        //.then(matches => notifyMatches(guild, guildConfig, matches));
        .then(matches => sanityCheck(matches))
        .then(matches => notifyMatches(guild, guildConfig, matches));
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
  }
});

client.login(auth.discord);