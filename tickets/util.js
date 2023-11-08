const config = require('../config.js');

const { PermissionsBitField } = require('discord.js');
const RoleType = {
  role: 0,
  member: 1
}

// NB: Bot needs "Manage channels" + "Manage roles" + "Manage Message" permissions
function defaultPermissions(guild) {
  return [
  // Allow bot to see its own tickets
  {
    id: '1161270926676082793',
    type: RoleType.role,
    allow: [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.ReadMessageHistory
    ]
  },
  // Failsafe - Add Kaze to the tickets initially before the permissions are properly sorted
  {
    id: '181499334855098379',
    type: RoleType.member,
    allow: [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.ReadMessageHistory
    ]
  },
  // Deny to everyone except permissioned
  {
    id: guild.roles.everyone,
    type: RoleType.role,
    deny: [ PermissionsBitField.Flags.ViewChannel ]
  }];
}


async function setData(client, ticketId, data) {
  await client.mongo.collection('ticket').findOneAndReplace(
    { _id: ticketId },
    data,
    { upsert: true }
  );}

async function updateData(client, ticketId, data) {
  await client.mongo.collection('ticket').findOneAndUpdate(
    { _id: ticketId },
    { $set: data }
  );
}

async function updateAuthorArray(client, ticketId, value) {
  await client.mongo.collection('ticket').findOneAndUpdate(
    { _id: ticketId },
    { $push: { author: value } }
  );
}

async function setPermissions(ticket, roles, authorIds) {
  var permissions = [
    // Allow bot to see its own tickets
    {
      id: '1161270926676082793',
      type: RoleType.role,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
      ]
    },
    // Deny to everyone except permissioned
    {
      id: ticket.guild.roles.everyone.id,
      type: RoleType.role,
      deny: [ PermissionsBitField.Flags.ViewChannel ]
    }
    // Add new roles
  ]
  
  for (const role of roles) {
    permissions.push({
      id: role,
      type: RoleType.role,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.ManageMessages
      ]
    });
  }

  for (const author of authorIds) {
    // Add ticket creator to channel
    permissions.push({
      id: author,
      type: RoleType.member,
      allow: [ PermissionsBitField.Flags.ViewChannel ],
      deny: []
    });
  }

  await ticket.permissionOverwrites.set(permissions);
  return ticket;
}

// Retrieve the next ID from ticketcount in Firestore, and increment the count
async function nextTicketId(client, prefix) {
  var doc = await client.mongo.collection('ticketcount').findOne({ _id: prefix });
  
  if (!doc) {
    await client.mongo.collection('ticketcount').insertOne({ _id: prefix, nextId: 2 });
    return '0001';
  }

  await client.mongo.collection('ticketcount').findOneAndUpdate({ _id: prefix }, { $set: { nextId: doc.nextId+1 }});
  return `${doc.nextId}`.padStart(4, '0')
}

async function ticketAuthors(ticket) {
  var doc = await ticket.client.mongo.collection('ticket').findOne({ _id: ticket.id });

  if (!doc) {
    return [];
  }
  
  return [ doc.author ].flat();
}

function ticketTeams(ticket) {
  return ticket.permissionOverwrites.cache.filter(p => p.type == RoleType.role && p.allow.has(PermissionsBitField.Flags.ViewChannel)).map(x => x.id);
}

async function renameTicket(ticket, options) { // Options include prefix, closed, claimed, hold
  var collection = ticket.client.mongo.collection('ticket');
  var ticketDetails = await collection.findOne({ _id: ticket.id });
  var serverConfig = config[ticket.guild.id];

  var isClosed = ticketDetails.status == 'CLOSED';
  var isHold = ticketDetails.status == 'HOLD';
  var isClaimed = ticket.name.includes('claimed-');
  var ticketPrefix = ticketDetails.prefix
  var ticketDigits = ticket.name.match(/\d+/)[0]
  
  if (isClosed && options.closed !== false) {
    throw 'Ticket has already been closed';
  }
  
  if (isHold && options.hold) {
    throw 'Ticket is already on hold';
  }
  
  if (isClaimed && options.claimed) {
    throw 'Ticket is already claimed';
  }
  
  if (options.prefix && options.prefix !== ticketPrefix)  {
    ticketPrefix = options.prefix;
    ticketDigits = await nextTicketId(ticket.client, options.prefix);
  }

  if (options.closed) {
    ticketPrefix = 'closed'
  } else if (options.hold) {
    ticketPrefix = 'hold'
  } else if (options.claimed) {
    ticketPrefix = 'claimed'
  }
  
  var nameUpdate = `${ticketPrefix}-${ticketDigits}`
  if (nameUpdate != ticket.name) {
    await ticket.setName(nameUpdate);
  }
  
  return ticket;
}

module.exports = {
  defaultPermissions: defaultPermissions,
  setPermissions: setPermissions,
  setData: setData,
  renameTicket: renameTicket,
  updateData: updateData,
  updateAuthorArray: updateAuthorArray,
  nextTicketId: nextTicketId,
  ticketAuthors: ticketAuthors,
  ticketTeams: ticketTeams
};