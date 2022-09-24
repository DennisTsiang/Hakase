const { SlashCommandBuilder } = require("discord.js");
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
    await whois(nick, interaction.client, async (string) => {
        await interaction.editReply(string);
    });
};


const commandsTable = new Map([
    ["whois", whois_interaction]
]);

module.exports = {
    commandsJSON,
    commandsTable
};
