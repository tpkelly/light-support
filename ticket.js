const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const common = require('./common.js');
const transcript = require('./tickets/transcript.js');
const tickutil = require('./tickets/util.js');
const log = require('./tickets/log.js');
const config = require('./config.js');
const fs = require('fs');

function configOptions(guild) {
  return config[guild.id].styleConfig;
}

async function createTicketChannel(guild, ticketName) {
  var createOptions = {
    name: ticketName,
    parent: config[guild.id].ticketCategory,
    permissionOverwrites: tickutil.defaultPermissions(guild)
  };
  
  return await guild.channels.create(createOptions);
}

async function sendBoilerplate(ticket, users, config, ticketReason) {
  var row = new ActionRowBuilder()
    .addComponents(new ButtonBuilder().setLabel('Close Ticket').setStyle('Danger').setCustomId('ticket-close').setEmoji('🔒'))

  var embed = common.styledEmbed(config.title, config.intro)
 
  if (ticketReason && ticketReason.getTextInputValue('reason')) {
    embed.fields = [{ name: 'Ticket Reason', value: "```" + ticketReason.getTextInputValue('reason') + "```" }];
  }

  ticket.send({
    content: `Hello <@${users.join('> <@')}>! One of our <@&${config.roles.join('> <@&')}> will be with you as soon as they can. Please note that tickets are logged for reference in case of later issues/complaints, and a copy may be requested for transparency.`,
    embeds: [embed],
    components: [row]
  });
  return ticket;
}

async function assignTicket(interaction, ticket, users, style, newTicket) {
  var config = configOptions(ticket.guild)[style];
 
  var collection = ticket.client.mongo.collection('ticket');
  var ticketDetails = await collection.findOne({ _id: ticket.id });
  var ticketprefix = ticketDetails.prefix;
 
  if ((ticketprefix == config.prefix) && !newTicket) {
    console.log('Ticket does not need to be reassigned');
    interaction.editReply({ content: 'Ticket does not need to be reassigned', ephemeral: true })
    return;
  }

  return await tickutil.setPermissions(ticket, config.roles, users)
    .then(t => sendBoilerplate(t, users, config, interaction.fields))
    .then(t => {
      var member = t.members.find(x => x.id == users[0]);
      if (member) {
        console.log(`Creating new ${style} for ${member.user.tag}`)
      } else {
        console.log(`Creating new ${style} for users`)
      }
    })
    .then(() => tickutil.updateData(ticket.client, ticket.id, {
        id: ticket.id,
        prefix: config.prefix,
        author: users
    }))
    .then(async () => await tickutil.renameTicket(ticket, { prefix: config.prefix }))
}

function createTicketDirect(interaction, guild, user, style) {
  var type = style.replace('ticket-new-');
  var config = configOptions(guild)[type];
  return tickutil.nextTicketId(guild.client, config.prefix)
    .then(digits => createTicketChannel(guild, `${config.prefix}-${digits}`))
    .then(ticket => {
      tickutil.setData(guild.client, ticket.id, { _id: ticket.id })
        .then(() => assignTicket(interaction, ticket, [user.id], type, true))
        .then(() => log.logCreated(ticket, config.logChannel))
        
      return ticket;
    });
}

function createTicket(interaction, guild, user, style) {
  var type = style.replace('ticket-new-', '');
  var config = configOptions(guild)[type];
  createTicketDirect(interaction, guild, user, type)
    .then(ticket => {
      interaction.reply({
        content: `Your ${config.prefix} ticket has been created in <#${ticket.id}>`,
        ephemeral: true
      })
  });
}

async function closeTicket(interaction, ticket) {
  var ticketAuthors = await tickutil.ticketAuthors(ticket);
  var pendingRow = new ActionRowBuilder()
    .addComponents(new ButtonBuilder().setLabel('Re-open ticket').setStyle('Primary').setCustomId('ticket-reopen'))
    
  var finishedRow = new ActionRowBuilder()
    .addComponents(new ButtonBuilder().setLabel('Re-open ticket').setStyle('Primary').setCustomId('ticket-reopen'))
    .addComponents(new ButtonBuilder().setLabel('Delete Ticket').setStyle('Danger').setCustomId('ticket-delete'))

  interaction.reply({ embeds: [common.styledEmbed('Ticket closed', 'Generating automatic transcript')], components: [pendingRow]})
    .then(() => tickutil.renameTicket(ticket, { closed: true }))
    .then(() => transcript.create(ticket.client, ticket, ticketAuthors))
    .then(() => interaction.editReply({ embeds: [common.styledEmbed('Ticket closed', 'Generated automatic transcript')], components: [finishedRow]}))
    .then(() => log.logClosed(ticket))
    .then(() => console.log(`Closing ticket ${ticket.name}`))
    .catch(err => interaction.followUp({ content: `Unable to update ticket: ${err}`, ephemeral: true }))
    
  // Remove authors from ticket, leaving only the assigned team
  for (const author of ticketAuthors) {
    ticket.permissionOverwrites.delete(author);
  }
}

async function reopenTicket(interaction, ticket, message) {
  await interaction.deferUpdate();
  
  var collection = ticket.client.mongo.collection('ticket');
  var ticketDetails = await collection.findOne({ _id: ticket.id });
  
  var config = Object.values(configOptions(ticket.guild)).filter(x => x.prefix == ticketDetails.prefix)[0]
  
  return await message.delete()
    .then(() =>  tickutil.renameTicket(ticket, { closed: false, prefix: ticketDetails.prefix }))
    .then(() => tickutil.ticketAuthors(ticket))
    .then(authors => tickutil.setPermissions(ticket, config.roles, authors))
    .then(() => log.logReopen(ticket))
    .then(() => ticket.send({ embeds: [common.styledEmbed('Ticket updated', 'Reopening ticket')] }))
    .then(() => console.log(`Reopening ${ticket.name}`))
    .catch(err => interaction.followUp({ content: `Unable to update ticket: ${err}`, ephemeral: true }));
}

async function addAuthor(ticket, userId) {
  var collection = ticket.client.mongo.collection('ticket');
  var ticketDetails = await collection.findOne({ _id: ticket.id });
  var ticketprefix = ticketDetails.prefix;
  
  var config = Object.values(configOptions(ticket.guild)).filter(x => x.prefix == ticketprefix)[0]
  
  return tickutil.updateAuthorArray(ticket.client, ticket.id, userId)
    .then(() => tickutil.ticketAuthors(ticket))
    .then(authors => tickutil.setPermissions(ticket, config.roles, authors))
}

function deleteTicket(interaction, ticket) {
  console.log(`Deleting ticket ${ticket.name}`);
  interaction.reply({embeds: [common.styledEmbed('Deleting', 'Ticket will be deleted in 10 seconds...')]});
  setTimeout(() => log.logDeleted(ticket).then(() => ticket.delete()), 10000);
}

async function reasonPrompt(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(interaction.customId.replace('ticket-reason-', 'ticket-new-'))
    .setTitle("New Ticket Reason");
    
  var style = interaction.customId.replace('ticket-reason-', '');
  var config = configOptions(interaction.guild)[style];
  var label = config.modalText || 'Tell us why you are getting in touch'
    
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setStyle(TextInputStyle.Paragraph).setLabel(label).setMaxLength(500).setRequired(false)))
    
  await interaction.showModal(modal);
}

function isTicketChannel(channel) {
  return (channel.parent.id === config[channel.guild.id].ticketCategory)
}

module.exports = {
  create: createTicket,
  createDirect: createTicketDirect,
  close: closeTicket,
  reopen: reopenTicket,
  delete: deleteTicket,
  addAuthor: addAuthor,
  reasonPrompt: reasonPrompt,
  isTicketChannel: isTicketChannel
};