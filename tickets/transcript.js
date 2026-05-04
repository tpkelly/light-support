const { AttachmentBuilder } = require('discord.js');
const utils = require('./transcriptUtils.js')

const archiveGuildId = '885290405850128414';
const archiveChannelId = '885290405850128417';

async function fetchMessages(channel) {
  var messages = [];
  
  // Fetch messages 100 at a time because of discord's API limits
  while (true) {
    var fetchOptions = { limit: 100 };
    if (messages.length) {
      fetchOptions.before = messages[0].id
    };
    
    var batch = Array.from((await channel.messages.fetch(fetchOptions)).values());
    
    if (!batch.length) {
      break;
    }
    
    messages = batch.reverse().concat(messages);
  }
  
  return messages;
}

async function formatMessages(client, channel, messages, authors) {
  var html = await utils.formatMessages(channel, messages);
  var file = new AttachmentBuilder(Buffer.from(html), { name: `${channel.name}.html` });

  console.log(`HTML transcript created for ${channel.name}`);
 
  var archiveGuild = await channel.client.guilds.fetch(archiveGuildId);
  var ticketArchive = await archiveGuild.channels.fetch(archiveChannelId);
 
  var transcriptMessage = await ticketArchive.send({files: [file] });
  for (const author of authors) {
    try {
      var recipient = await channel.guild.members.fetch(author);
      var recipientDM = recipient.dmChannel || await recipient.createDM();
      await recipientDM.send({files: [file] });
    } catch {
      console.error(`Could not send transcript to ${author}`);
    }
  }
  
  await client.mongo.collection('ticket').findOneAndUpdate(
    { _id: channel.id},
    { $set: { transcript: transcriptMessage.attachments.first().url } }
  );
}

async function create(client, ticket, authors) {
  console.log(`Transcribing ticket ${ticket.name}`);
  var allMessages = await fetchMessages(ticket);
  await formatMessages(client, ticket, allMessages, authors);
}

async function transcriptUrl(client, ticketId) {
  var doc = await client.mongo.collection('ticket').findOne({ _id: ticketId });
 
  if (!doc) {
    console.error(`Could not generate transcript for ${ticketId}`)
    return 'https://nothing.com/';
  }
  
  var currentUrl = doc.transcript;
  var urlComponents = currentUrl.split('/');
  var attachmentId = urlComponents[urlComponents.indexOf(archiveChannelId)+1]

  var archiveGuild = await client.guilds.fetch(archiveGuildId);
  var ticketArchive = await archiveGuild.channels.fetch(archiveChannelId);
  var archiveMessages = await ticketArchive.messages.fetch({limit: 10, cache: false, around: attachmentId}) // Jank to try and find the rough location of the message that spawned from the attachment
    .then(msgs => msgs.filter(x => x.attachments.first().id == attachmentId));
  
  return archiveMessages.first().attachments.first().url;
}

module.exports = {
  create: create,
  transcriptUrl: transcriptUrl,
  fetchMessages: fetchMessages
};