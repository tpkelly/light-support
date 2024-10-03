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

  var memberNames = {};
  for (const key of Object.keys(matches)) {
    var member = await guild.members.fetch(key);
    memberNames[key] = `${member.displayName} (${member.user.tag})`
  }
  
  for (const key of Object.keys(matches)) {
    var options = matches[key]
    await collection.insertOne({ _id: key, matches: options });
  
    await rouletteChannel.threads.create({
      name: 'Roulette Preference',
      type: ChannelType.PrivateThread,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
      invitable: false    
    }).then(async thread => {
      // Invite the roleplayer
      await thread.members.add(key);
      
      var embedText = "Welcome to the Roleplay Pre-Roulette!\n\nBefore we match you with other roleplayers, you have the opportunity to fine-tune your match. You have the choice of 3 other matches, and can either say you are happy with any of them, remove one match from the possibilities, or otherwise decide you aren't feeling the roleplay this month and remove yourself.\n\nThe matches will begin in 24 hours, and a lack of a reply will be taken as accepting any of the options. While we make  the best efforts to match you according to your preferences, please understand that this is not always possible. Happy roleplaying!\n"
      var selectOptions = new StringSelectMenuBuilder().setPlaceholder('Roleplay Preference').setCustomId('roulette-preference').addOptions(
          new StringSelectMenuOptionBuilder().setLabel('Happy with any').setValue('any'),
          new StringSelectMenuOptionBuilder().setLabel("I don't want to roleplay").setValue('none')
      );

      for (var i = 0; i < options.length; i++) {
        embedText += `\nOption ${i+1}: ${memberNames[options[i]]}`
        selectOptions.addOptions(new StringSelectMenuOptionBuilder().setLabel(`Remove Option ${i+1}`).setValue(options[i]));
      }
      
      var embed = common.styledEmbed('Roleplay Roulette', embedText);
     
      var row = new ActionRowBuilder().addComponents(selectOptions);
      await thread.send({ content: `<@${key}>`, embeds: [embed], components: [row] });
    });
  }
}

client.once('ready', async () => {
  console.log(`Roulette Filter task as ${client.user.tag} @ ${new Date().toLocaleString()}!`);
  try {
    for (const guildConfig of config.all) {
      var guild = client.guilds.resolve(guildConfig.id);
      await generateMatches(guild, guildConfig)
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