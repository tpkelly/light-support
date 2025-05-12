const beepBoopRole = '1213818358630187028';

const arrDiff = (a, b) => a.filter((v) => b.indexOf(v) == -1)

module.exports = {
  name: 'guildMemberUpdate',
  execute: (client, args) => {
    const oldMember = args[0];
    const newMember = args[1];
    
    var newRoles = arrDiff(newMember.roles.cache.map(r => r.id), oldMember.roles.cache.map(r => r.id));
    if (newRoles && newRoles[0] == beepBoopRole) {
      // Don't kick actual discord bots
      if (newMember.user.bot) {
        return;
      }

      newMember.kick('Failed the Beep Boop Check');
    }
  }
}