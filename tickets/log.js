const { ButtonBuilder, ActionRowBuilder } = require('discord.js');
const common = require('../common.js');
const util = require('./util.js');
const transcript = require('./transcript.js');

async function fieldsForTicket(ticket, status) {
  var authors = await util.ticketAuthors(ticket)
  var teams = util.ticketTeams(ticket)
  var allMessages = await transcript.fetchMessages(ticket);
  var allMessageAuthors = allMessages.map(x => x.author.id)
    // Get distinct
    .filter((v, i, a) => a.indexOf(v) === i)
    
  var allStaff = allMessageAuthors.filter(x => authors.indexOf(x) == -1)
  
  return [
    { name: 'Author', value: `<@${authors.join('>\n<@')}>`, inline: true },
    { name: 'Created', value: `<t:${Math.floor(ticket.createdTimestamp/1000)}>`, inline: true },
    { name: 'Status', value: status, inline: true },
    { name: 'Staff Involved', value: `<@${allStaff.join('>\n<@')}>`, inline: true },
    { name: 'Teams Assigned', value: `<@&${teams.join('>\n<@&')}>`, inline: true },
  ]
}

async function logForTicket(ticket) {
  var doc = await ticket.client.mongo.collection('ticket').findOne({ _id: ticket.id });
 
  if (!doc) {
    return;
  }

  var logChannel = await ticket.guild.channels.fetch(doc.logChannel);
  var logMessage = await logChannel.messages.fetch(doc.logId);
  var transcript = doc.transcript;
  
  return { message: logMessage, transcript: transcript };
}

async function logCreated(ticket, logChannelId) {
  var logChannel = await ticket.guild.channels.fetch(logChannelId);

  var embed = common.styledEmbed(ticket.name, 'New ticket created', 0x74a372); 
  var logMessage = await logChannel.send({
    embeds: [embed],
  });
  
  await util.updateData(ticket.client, ticket.id, { logChannel: logChannelId, logId: logMessage.id })
  await logReopen(ticket);
}

async function logReopen(ticket) {
  var logDetails = await logForTicket(ticket);
  
  var buttons = new ActionRowBuilder()
    .addComponents(new ButtonBuilder().setLabel('Go to ticket').setStyle('Link').setURL(`https://discord.com/channels/${ticket.guild.id}/${ticket.id}/`))
  var embed = common.styledEmbed(ticket.name, 'New ticket created', 0x74a372); 
  embed.fields = await fieldsForTicket(ticket, 'OPEN');
  
  await logDetails.message.edit({
    embeds: [embed],
    components: [buttons]
  });
  
  await util.updateData(ticket.client, ticket.id, { status: 'OPEN' })
}

async function logClosed(ticket) {
  var logDetails = await logForTicket(ticket);
  
  var buttons = new ActionRowBuilder()
    .addComponents(new ButtonBuilder().setLabel('Go to ticket').setStyle('Link').setURL(`https://discord.com/channels/${ticket.guild.id}/${ticket.id}/`))
    .addComponents(new ButtonBuilder().setLabel('Transcript').setStyle('Link').setURL(logDetails.transcript))
  var embed = common.styledEmbed(ticket.name, 'Ticket Closed', 0x9e5552); 
  embed.fields = await fieldsForTicket(ticket, 'CLOSED');
  
  await logDetails.message.edit({
    embeds: [embed],
    components: [buttons]
  })
  
  await util.updateData(ticket.client, ticket.id, { status: 'CLOSED' })
}

async function logHold(ticket) {
  var logDetails = await logForTicket(ticket);
  
  var buttons = new ActionRowBuilder()
    .addComponents(new ButtonBuilder().setLabel('Go to ticket').setStyle('Link').setURL(`https://discord.com/channels/${ticket.guild.id}/${ticket.id}/`))
  var embed = common.styledEmbed(ticket.name, 'Ticket on hold', 0xcfca3a); 
  embed.fields = await fieldsForTicket(ticket, 'HOLD');
  
  await logDetails.message.edit({
    embeds: [embed],
    components: [buttons]
  });
  
  await util.updateData(ticket.client, ticket.id, { status: 'HOLD' })
}

async function logReassigned(ticket, logChannelId, logPrefix) {
  var logDetails = await logForTicket(ticket);
  
  await util.updateData(ticket.client, ticket.id, { logChannel: logChannelId, prefix: logPrefix })
  await logCreated(ticket, logChannelId)
  await logDetails.message.delete();
}

async function logDeleted(ticket) {
  var logDetails = await logForTicket(ticket);
  
  var embed = common.styledEmbed(ticket.name, 'Ticket Deleted',  0x8080a0);
  embed.fields = await fieldsForTicket(ticket, 'DELETED');
  
  await logDetails.message.edit({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Transcript').setStyle('Link').setURL(logDetails.transcript))]
  });
  await util.updateData(ticket.client, ticket.id, { status: 'DELETED' })
}

module.exports = {
  logCreated: logCreated,
  logReopen: logReopen,
  logClosed: logClosed,
  logHold: logHold,
  logReassigned: logReassigned,
  logDeleted: logDeleted,
};