const { Client, Collection, IntentsBitField, ApplicationCommandType } = require('discord.js');
const fs = require('fs');
const { MongoClient } = require('mongodb');

const client = new Client({
  intents: [IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.Guilds],
  partials: ['MESSAGE', 'CHANNEL']
});

const auth = require('./auth.json');
const config = require('./config.js');

client.once('ready', async () => {
  client.user.setActivity("If broke, return to Kazenone");
  
  client.mongo = new MongoClient(auth.mongodb).db();
  
  // Register commands
  client.commands = new Collection();
  const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

  // Discord does not like us authenticating with bot tokens, so we need a bearer token instead
  const params = new URLSearchParams();
  params.append('client_id', auth.clientId);
  params.append('client_secret', auth.clientSecret);
  params.append('grant_type', 'client_credentials');
  params.append('scope', 'identify');

  var tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  var token = await tokenResponse.json();
  
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
    
    if (command.guildCommand) {
      // Register guild application slash commands
      for (const guildConfig of config.all) {
        var guild = client.guilds.resolve(guildConfig.id);

        if (guild)
        {
          var newCommand = await guild.commands.create({
            name: command.name,
            description: command.description,
            options: command.options,
            type: command.type || ApplicationCommandType.ChatInput,
            defaultPermission: false,
          });
          
          await fetch(`https://discord.com/api/v10/applications/${client.application.id}/guilds/${guildConfig.id}/commands/${newCommand.id}/permissions`, {
              method: 'POST',
              headers: { Authentication: `Bearer ${token.access_token}` },
              body: {
                permissions: guildConfig.adminRoles.map(x => ({ id: x, type: /* Role */ 1, permission: true }))
              }
            });
        }
      }
    }
    else {
      // Register application slash commands
      client.application.commands.create({
        name: command.name,
        description: command.description,
        options: command.options,
        type: command.type || ApplicationCommandType.ChatInput,
        defaultPermission: true,
      });
    }
  }
  
  // Register event handlers
  client.events = new Collection();
  const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
  
  for (const file of eventFiles) {
    const eventLogic = require(`./events/${file}`);
    client.on(eventLogic.name, (...eventArgs) => eventLogic.execute(client, eventArgs));
  }
 
  console.log(`Logged in as ${client.user.tag} @ ${new Date().toLocaleString()}!`);
});

client.login(auth.discord);