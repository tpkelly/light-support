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
const logic = require('./rouletteLogic.js');

client.once('ready', async () => {
  console.log(`Roulette Draw task as ${client.user.tag} @ ${new Date().toLocaleString()}!`);
  try {
    client.mongo = new MongoClient(auth.mongodb).db()
    var guildConfig = config['1153335701186809856'];
    var guild = client.guilds.resolve(guildConfig.id);
    await logic.generateMatches(guild, guildConfig)
  } catch (err) {
    console.error(err);
    common.sendHook(config.rouletteWebhook.id, config.rouletteWebhook.token, err);
  } finally {
    client.destroy();
  }
});

client.login(auth.discord);