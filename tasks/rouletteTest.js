const { Client, IntentsBitField } = require('discord.js');

const client = new Client({
  intents: [IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.Guilds],
  partials: ['MESSAGE', 'CHANNEL']
});

const matchData = require('./roulette.data.js');

const auth = require('../auth.json');
const config = require('../config.js');
const logic = require('./rouletteLogic.js');

client.once('ready', async () => {
  console.log(`Roulette Test Draw task as ${client.user.tag} @ ${new Date().toLocaleString()}!`);
  try {
    var guildConfig = config['1153335701186809856'];
    var guild = client.guilds.resolve(guildConfig.id);
    guildConfig.testdata = matchData;
    
    await logic.generateMatches(guild, guildConfig)
  } catch (err) {
    console.error(err);
  } finally {
    client.destroy();
  }
});

client.login(auth.discord);