// NB: Don't close <Base-Transcript> tag otherwise we get a load of whitespace at the bottom from a second full height <body> tag
const template = `<Base-Transcript>
<script src="https://tickettool.xyz/transcript/transcript.bundle.min.obv.js"></script><script type="text/javascript">function embedImages() { let dataNodes = Array.from(document.querySelectorAll('.chatlog .markdown')).filter(elem => elem.innerHTML.includes(' [[')); for (const node of dataNodes) { node.outerHTML = node.innerHTML.replaceAll('[[', '<').replaceAll(']]', '>') } } let channel = [channelinfo];let server = [serverinfo];let messages = [messageinfo];window.Convert(messages, channel, server); embedImages();</script>`;

async function imageUrlToData(arrayBuffer, contentType) {
  var bytes = new Uint8Array(Buffer.from(arrayBuffer));
  var binary = '';
  for (var i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  var base64Data = btoa(binary);
  return` [[img style="max-height: 150px" src="data:${contentType};base64,${base64Data}" /]]`
}

function mapMentions(guild, mentions) {
  var discordData = {};
  
  for (const channel of mentions.channels.values()) {
    discordData[channel.id] = { name: channel.name };
  }
  
  for (const member of mentions.members.values()) {
    discordData[member.id] = { name: member.user.username, tag: member.user.tag, nick: member.nickname || member.user.username };
  }
  
  for (const role of mentions.roles.values()) {
    discordData[role.id] = { name: role.name };
  }
  
  return discordData;
}

async function ticketMessageObject(message) {
  var content = message.content;
  for (const attachment of message.attachments.values()) {
    var fileData = await fetch(attachment.attachment)
      .then(res => res.arrayBuffer())
      .then(data => imageUrlToData(data, attachment.contentType));
    
    content = content ? `${content}\n ${fileData}` : fileData;
  }
  
  return {
		"discordData": mapMentions(message.guild, message.mentions),
		"attachments": [],
		"reactions": [],
		"content": content,
		"components": message.components,
		"user_id": message.author.id,
		"bot": message.author.bot,
		"username": message.author.username,
		"nick": message.member?.nickname || message.author.username,
		"tag": message.author.discriminator,
		"avatar": message.author.avatar,
		"id": message.id,
		"created": message.createdTimestamp,
		"edited": message.editedTimestamp,
    "embeds": message.embeds.map(e => { return {
      "title": e.title || undefined,
      "description": e.description || undefined,
      "url": e.url || undefined,
      "color": e.color ? `#${e.color.toString(16)}` : undefined,
      "thumbnail": e.thumbnail || undefined,
      "image": e.image || undefined,
      "footer": e.footer || undefined,
      "fields": e.fields
    }})
	}
}

async function formatMessages(channel, messages) {
  var allMessages = await Promise.all(messages.map(m => ticketMessageObject(m)))

  // Turn groups into HTML somehow
  var html = template;
  html = html.replace('[channelinfo]', `{"name":"${channel.name}","id":"${channel.id}"}`);
  html = html.replace('[serverinfo]', `{"name":"${channel.guild.name}","id":"${channel.guild.id}","icon":"${channel.guild.icon}"}`);
  html = html.replace('[messageinfo]', JSON.stringify(allMessages));

  return html
}

module.exports = {
  formatMessages: formatMessages,
  imageUrlToData: imageUrlToData
};