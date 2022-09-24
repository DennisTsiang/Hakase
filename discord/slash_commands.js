const { SlashCommandBuilder, MessageMentions: { GlobalUsersPattern }} = require("discord.js");
const { whois } = require("./commands.js");

const commandsJSON = [
    new SlashCommandBuilder()
        .setName("whois")
        .setDescription("Return real name of discord user or vice versa. Also accepts @ mentions.")
        .addStringOption(option =>
            option.setName("nick")
                .setDescription("The discord username or real name")
                .setRequired(true)),
]
    .map(command => command.toJSON());

var whois_interaction = async (interaction) => {
    var nick = interaction.options.getString("nick");
    var mention = await getUsernameFromMention(interaction, nick);
    if (mention != null) {
        nick = mention;
    }
    await whois(nick, interaction.client, async (string) => {
        await interaction.editReply(string);
    });
};

async function getUsernameFromMention(interaction, mention) {
    // The id is the first and only match found by the RegEx.
    const matches = mention.matchAll(GlobalUsersPattern).next().value;

    // If supplied variable was not a mention, matches will be null instead of an array.
    if (!matches) return null;

    // The first element in the matches array will be the entire mention, not just the ID,
    // so use index 1.
    const id = matches[1];

    var user = await interaction.client.users.fetch(id);
    return user.username;
}

const commandsTable = new Map([
    ["whois", whois_interaction]
]);

module.exports = {
    commandsJSON,
    commandsTable
};
