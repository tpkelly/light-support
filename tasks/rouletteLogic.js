const { ChannelType, ActionRowBuilder, ButtonBuilder } = require('discord.js');

const common = require('../common.js');

function removeMatch(id, matches) {
  for (const match of matches[id].matches) {
    matches[match].matches = matches[match].matches.filter(x => x != id)
  }
  
  delete matches[id];
  
  return matches;
}

async function drawTriple(channel, config, matches, sortedMatches) {
  for (const id of sortedMatches) {
    for (const firstMatch of matches[id].matches) {
      for (const secondMatch of matches[firstMatch].matches)
      {
        // Found our triple
        if (matches[secondMatch].matches && matches[secondMatch].matches.includes(id)) {
          matches = removeMatch(id, matches)
          matches = removeMatch(firstMatch, matches)
          matches = removeMatch(secondMatch, matches)
          
          await setupRouletteChannel(channel, config, [id, firstMatch, secondMatch])
          return matches;
        }
      }
    }
  }
  
  console.error('Could not find a triple');
  return matches;
}

function compareShuffle(a, b) {
  if (a.value.matches.length == b.value.matches.length) {
    return Math.random() - 0.5 - (a.value.veto?.length || 0) + (b.value.veto?.length || 0)
  }
  
  // Push results with no valid matches to the end
  if (a.value.matches.length == 0) return 1;
  if (b.value.matches.length == 0) return -1;
  
  // Prioritise results with fewer valid matches
  if (a.value.matches.length > b.value.matches.length) return 1;
  if (a.value.matches.length < b.value.matches.length) return -1;
}

function mapObject(obj) {
  var result = [];
  for (let key in obj) {
    result.push({ key: key, value: obj[key] })
  }
  return result;
}

async function generateMatches(guild, config) {
  if (!guild) {
    return [];
  }

  var matches = {};

  if (config.testdata) {
    for (const row of config.testdata) {
      matches[row['_id']] = row;
    }
  } else {
    var collection = guild.client.mongo.collection('roulette');
    for (const row of await collection.find().toArray()) {
      matches[row['_id']] = row;
    }
  }
  
  var rouletteChannel = guild.channels.resolve(config.rouletteChannel);
  
  var sortedMatches = mapObject(matches).sort(compareShuffle).map(x => x.key);;
  //console.dir(sortedMatches, { depth: null});
  //console.dir(matches, { depth: null});
  
  // Odd number of matches, try to find a triple
  if (sortedMatches.length % 2 == 1) {
    matches = await drawTriple(rouletteChannel, config, matches, sortedMatches);
  }
  
  var unmatched = [];
  
  while (Object.keys(matches).length >= 2) {
    // Prioritise people with fewest options
    sortedMatches = mapObject(matches).sort(compareShuffle).map(x => x.key);

    if (matches[sortedMatches[0]].matches.length > 0) {
      await setupRouletteChannel(rouletteChannel, config, [sortedMatches[0], matches[sortedMatches[0]].matches[0]])
      matches = removeMatch(matches[sortedMatches[0]].matches[0], matches)
    } else { // We ran out of matches for this person, so go to Plan B
      unmatched.push(sortedMatches[0]);
    }
    
    matches = removeMatch(sortedMatches[0], matches);
  }
  
  unmatched = unmatched.concat(Object.keys(matches));
  
  console.log('Handle unpaired matches');
  // Plan B: Pair together anybody who was unable to be matched
  var i = 0;
  for (; i < unmatched.length-3; i+=2) {
    await setupRouletteChannel(rouletteChannel, config, [unmatched[i], unmatched[i+1]])
  }
  
  await setupRouletteChannel(rouletteChannel, config, unmatched.splice(i))
  
  console.log('Done with matches');
}

async function setupRouletteChannel(parentChannel, config, roleplayers) {
  console.log(`Matching ${roleplayers.join(', ')}`);
  
  // Don't create channels if this is only a test
  if (config.testdata) {
    return;
  }

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

module.exports = {
  generateMatches: generateMatches
}