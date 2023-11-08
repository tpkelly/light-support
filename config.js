const ticketQuery = `Please let us know:
> - Why are you reaching out?
> - If we should be adding someone to this channel?
> - Do you have any links, screenshots or logs you need to share?`;

const testServer = {
  id: '589466032662642689',
  rouletteRole: '1159185966079148173',
  rouletteChannel: '589466032662642691',
  notifyChannel: '589466032662642691',
  adminRoles: ['589474925958660140']
}

const lightRPC = {
  id: '1153335701186809856',
  rouletteRole: '1162145407888003215',
  rouletteChannel: '1153338811015757864',
  notifyChannel: '1165645990066405376',
  adminRoles: ['1153340437076127866'],
  ticketCategory: '1171907138419961917',
  createTicketBoilerplate: 'Need to get in touch with our staff? Use the buttons below to raise a ticket',
  styleConfig: {
    'general': { roles: ["1153340437076127866"], prefix: 'general', buttonTitle: 'General Queries', title: 'General Query', emoji: '❓', intro: ticketQuery, logChannel: "1171907552699764797" }
  }
}

module.exports = {
  '589466032662642689': testServer,
  '1153335701186809856': lightRPC,
  all: [testServer, lightRPC]
};