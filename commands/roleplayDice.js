const { ApplicationCommandOptionType } = require('discord.js');
const common = require('../common.js');

  const expansionLocations = [
    { name: 'A Realm Reborn', locations: [
      'Carline Canopy - New Gridania',
      'The Bobbing Cork - North Shroud',
      "Buscarron's Druthers - South Shroud",
      'The Hawthorne Hut - East Shroud',
      "Gabineaux's Bower - Central Shroud",
      'Amethyst Shallows - Lavender Beds, Ward 1',
      'Little Solace - The Black Shroud',
      'Ehcatl - North Shroud',
      'Hyrstmill - North Shroud',
      'Dragonhead Observatorium Tavern - Coerthas Central Highlands',
      'Whitebrim Front - Coerthas Central Highlands',
      'The Seventh Heaven - Mor Dhona',
      "Rowena's House of Splendors Cafe - Mor Dhona",
      "The Quicksand - Ul'dah, Steps of Nald",
      'The Manderville Lounge - The Gold Saucer',
      'Vesper Bay Bar - Western Thanalan',
      'The Coffer & Coffin - Central Thanalan',
      'Camp Drybone Bar - Eastern Thanalan',
      'Brimming Heart - The Goblet, Ward 1',
      'The Silver Bazaar - Western Thanalan',
      'Little Ala Mhigo - Southern Thanalan',
      'Forgotten Springs - Southern Thanalan',
      'The Drowning Wench - Upper Decks, Limsa Lominsa',
      'The Missing Member - Upper Decks, Limsa Lominsa',
      'The Bismarck - Upper Decks, Limsa Lominsa',
      'Camp Bronze Lake - Upper La Noscea',
      'Aleport Tavern - Western La Noscea',
      'Costa del Sol - Eastern La Noscea',
      'Wineport Tavern - Eastern La Noscea',
      'Mist Beach - Mist, Ward 1',
      'Moraby Drydocks - Lower La Noscea',
      'The Wolves Den Pier'
    ]},
    { name: 'Heavensward', locations: [
      'The Forgotten Knight - Ishgard, Foundation',
      "Falcon's Nest - Coerthas Western Highlands",
      'The Hard Place - Idyllshire',
      'Asah - The Churning Mists',
      'Tailfeather - The Dravanian Forelands',
      "Ok' Zundu - The Sea of Clouds"
    ]},
    { name: 'Stormblood', locations: [
      'Market Stalls - Ala Mhigan Quarter, The Lochs',
      'Shiokaze Hostelry - Kugane',
      'Bokaisen Hot Springs - Kugane',
      'Onokoro Village - Ruby Sea',
      'The Coral Banquet - Ruby Sea',
      'Isari Beach - Ruby Sea',
      'Yuzuka Manor - Yanxia',
      'Reunion - Azim Steppe',
      'Shirakumo Hot Springs - Shirogane Ward 1',
      'Hidden Shores - Shirogane Ward 1',
      'Dotharl Khaa - The Azim Steppe'
    ]},
    { name: 'Shadowbringers', locations: [
      'The Beehive - Eulmore',
      'Amity - Kholusia',
      'The Church of the First Light - Lakeland',
      'The Wandering Stairs - Crystarium',
      'The Cabinet of Curiousity - Crystarium',
      'Mord Souq Market - Ahm Araeng',
      'Twine - Ahm Araeng',
      "Slitherbough - The Rak'tika Greatwood",
      'The Capitol - Tempest',
      'Pla Enni - Il Mheg'
    ]},
    { name: 'Endwalker', location: [
      'Unnamed Island',
      'Noumenon - Old Sharlayan',
      'The Last Stand - Old Sharlayan',
      'The Agora - Old Sharlayan',
      'Sharlayan Hamlet - Labyrinthos',
      'The Great Work - Thavnair',
      "Kadjaya's Footsteps - Thavnair",
      "Mehryde's Meyhana - Radz-at-Han",
      'Ruveydah Fibers - Radz-at-Han',
      'Tertium - ||Garlemald||',
      'The Last Dregs - Ultima Thule',
      "The Watcher's Palace - Mare Lamentorum",
      'Greatest Endsvale - Mare Lamentorum',
      'Anagnorisis - ||Elpis||',
      'Propylaion - ||Elpis||'
    ]}
  ]

const setting = [ 'Business meeting', 'Random encounter', 'Social event', 'Just a dream...', 'Adventure', 'Sightseeing/Field trip', 'Shopping', 'Hunting' ];
const how = [ 'Friendly', 'Polite', 'Tense', 'Fight!!!', 'Competition', 'Teaming up' ];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  name: 'rpdice',
  description: 'Generate a recommended setting for roleplaying',
  options: [
    { type: ApplicationCommandOptionType.String, name: "progression", description: "Include any locations up to and including this expansion (Defaults to 'Endwalker')", required: false, choices: [
      { name: 'A Realm Reborn', value: 'A Realm Reborn' },
      { name: 'Heavensward', value: 'Heavensward' },
      { name: 'Stormblood', value: 'Stormblood' },
      { name: 'Shadowbringers', value: 'Shadowbringers' },
      { name: 'Endwalker', value: 'Endwalker' }
    ]}
  ],
  executeInteraction: async(interaction) => {
    var upToExpansion = interaction.options.getString('progression') ?? 'Endwalker';
    var filteredLocations = [];
    for (const expansion of expansionLocations) {
      filteredLocations = filteredLocations.concat(expansion.locations);
      
      if (expansion.name === upToExpansion) {
        break;
      }
    }
    
    const randomPlace = randomElement(filteredLocations);
    const randomSetting = randomElement(setting);
    const randomHow = randomElement(how);
    
    var embed = common.styledEmbed('Roleplay Dice Roll!', `Generating a setting for roleplay... :game_die:\n\n**Where**: ${randomPlace}\n**What**: ${randomSetting}\n**How**: ${randomHow}\n\n*Remember, you can choose to use all of these, or pick-and-choose. It's your roleplay!*`);
    
    interaction.editReply({ embeds: [embed] });
  }
};