/* This file only needs to be run once. You should only run it again if you add or edit existing commands */
const conf = require("../config/conf.js");
const { REST, Routes } = require("discord.js");
const { commandsJSON } = require("./slash_commands.js");

try {
    conf("../conf.json");
} catch (err) {
    console.log("error", JSON.stringify(JSON.parse(err.response.text), null, 2));
    process.exit(-1);
}

const rest = new REST({ version: "10" }).setToken(conf().Discord.APIKey);
rest.put(Routes.applicationGuildCommands(conf().Discord.AppId, conf().Discord.GuildId), { body: commandsJSON })
    .then((data) => console.log(`Successfully registered ${data.length} application commands.`))
    .catch(console.error);