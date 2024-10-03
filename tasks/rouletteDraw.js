const { Client, IntentsBitField, ChannelType, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const { MongoClient } = require('mongodb');
const fs = require('fs');

const client = new Client({
  intents: [IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.Guilds],
  partials: ['MESSAGE', 'CHANNEL']
});

const auth = require('../auth.json');
const config = require('../config.js');
const common = require('../common.js');

const KazeID = '181499334855098379'

function removeMatch(id, matches) {
  if (id == KazeID) {
    return matches;
  }
  
  for (const match of matches[id].filter(x => x != KazeID)) {
    matches[match] = matches[match].filter(x => x != id)
  }
  
  delete matches[id];
  
  return matches;
}

async function drawTriple(channel, config, matches, sortedMatches) {
  for (const id of sortedMatches) {
    for (const firstMatch of matches[id]) {
      for (const secondMatch of matches[firstMatch])
      {
        // Found our triple
        if (matches[secondMatch] && matches[secondMatch].includes(id)) {
          matches = removeMatch(id, matches)
          matches = removeMatch(firstMatch, matches)
          matches = removeMatch(secondMatch, matches)
          
          await setupRouletteChannel(channel, [id, firstMatch, secondMatch], config)
          return matches;
        }
      }
    }
  }
  
  console.error('Could not find a triple');
  return matches;
}

function compareShuffle(a, b) {
  if (a.length > b.length) return 1;
  if (a.length < b.length) return -1;
  
  return Math.random() - 0.5;
}

async function generateMatches(guild, config) {
  if (!guild) {
    return [];
  }
  
  var mongo = new MongoClient(auth.mongodb).db();
  var collection = mongo.collection('roulette');
  var matches = {};
  for (const row of await collection.find().toArray()) {
    matches[row['_id']] = row['matches'];
  }
  
  var rouletteChannel = guild.channels.resolve(config.rouletteChannel);
  
  var sortedMatches = Object.keys(matches).sort(compareShuffle).filter(x => x != KazeID);
  // Odd number of matches, try to find a triple
  if (sortedMatches.length % 2 == 1) {
    matches = await drawTriple(rouletteChannel, config, matches, sortedMatches);
  }
  
  var unmatched = [];
  
  while (Object.keys(matches).length >= 1) {
    // Prioritise people with fewest options
    sortedMatches = Object.keys(matches).sort(compareShuffle).filter(x => x != KazeID);

    if (matches[sortedMatches[0]].length > 0) {
      await setupRouletteChannel(rouletteChannel, [sortedMatches[0], matches[sortedMatches[0]][0]], config)
      matches = removeMatch(matches[sortedMatches[0]][0], matches)
    } else { // We ran out of matches for this person, so go to Plan B
      unmatched.push(sortedMatches[0]);
    }
    
    matches = removeMatch(sortedMatches[0], matches);
  }
  
  // Plan B: Pair together anybody who was unable to be matched
  for (var i = 0; i < unmatched.length; i+=2) {
    await setupRouletteChannel(rouletteChannel, [unmatched[i], unmatched[i+1]], config)
  }
  
  console.log('Done with matches');
}

async function setupRouletteChannel(parentChannel, roleplayers, config) {
  return parentChannel.threads.create({
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

client.once('ready', async () => {
  console.log(`Roulette Draw task as ${client.user.tag} @ ${new Date().toLocaleString()}!`);
  try {
    var guildConfig = config['1153335701186809856'];
    var guild = client.guilds.resolve(guildConfig.id);
    await generateMatches(guild, guildConfig)
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
  }
});

client.login(auth.discord);