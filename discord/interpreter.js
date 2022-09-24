const Promise = require("promise");
const Logger = require("../logger/logger");

const conf = require("../config/conf");
const auth = require("../user/auth");
const userfunction = require("../user/user");
const Discord = require("discord.js");
const hakase = require("./hakase_responses");
const { whois } = require("./commands");

const USER_NOT_FOUND_MESSAGE = "Hakase couldn't find such a user with that nickname! Hakase will have to ask Nano about it when she gets home!";

module.exports.handleCom = async (message, client) => {
    var command = message.cleanContent.split(" ");
    var op = command.shift();
    switch (op) {
    case "!whois":
        var nick = command.join(" ").trim();
        await whois(nick, client, async (string) => { await message.channel.send(string); });
        break;
    case "!insertuser":
    case "!insert_user":
        var guildMember = message.member;
        var roles = Array.from(guildMember.roles.cache.values()).map(role => role.name);
        if (!(roles.includes(conf().Discord.AdminRole) ||
                guildMember.hasPermission("MANAGE_GUILD") ||
                guildMember.hasPermission("ADMINISTRATOR"))) {
            await message.channel.send(`Only ${conf().Discord.AdminRole} members or server managers are allowed to use this command.`);
            return;
        }
        var params = command.join(" ").split(",");
        if (params.length !== 3) {
            await message.channel.send("Incorrect number of arguments. Please supply arguments as [discord name], [fresher/non-fresher], [real name]");
            return;
        }
        var nick = params[0];
        var fresher = params[1].trim().toLowerCase() === "fresher";
        var name = params[2];
        name = name.trim();
        var blacklist = ["Bot Guildy", "@Bot Guildy"];
        if (blacklist.includes(nick)) {
            Logger.log("info", `There was an attempt to add an invalid user: ${nick}`);
            await message.channel.send(`There was an attempt to add an invalid user: ${nick}`);
            return;
        }
        Logger.log("info", `Now attempting to insert new user ${nick}`);
        if (message.mentions.users.size > 0) {
            var messageMentions = message.mentions;
            if (messageMentions.users.size > 1) {
                Logger.log("info", "Too many users mentioned.");
                await message.channel.send("Please only supply one user.");
                return;
            }
            for (let [id, user] of messageMentions.users) {
                var user_details = { name: name };
                auth.addUser(id, user_details);
                userfunction.addRoleByUserId(conf().Discord.MemberRole, id, client);
                if (fresher) {
                    userfunction.addRoleByUserId(conf().Discord.FresherRole, id, client);
                }
            }
            await message.channel.send("Command completed.");
        } else {
            userfunction.findUidByNick(nick, client).then(async (id) => {
                if (id === -1) {
                    await message.channel.send(USER_NOT_FOUND_MESSAGE);
                    return;
                } else if (id === -2) {
                    await message.channel.send("There were multiple matches for that nickname. Please use the @ mention.");
                    return;
                } else {
                    var user_details = { name: name };
                    auth.addUser(id, user_details);
                    userfunction.addRoleByUserId(conf().Discord.MemberRole, id, client);
                    if (fresher) {
                        userfunction.addRoleByUserId(conf().Discord.FresherRole, id, client);
                    }
                    await message.channel.send("Command completed.");
                }
            });
        }
        break;
    case "!list_users":
        var guildMember = message.member;
        var roles = Array.from(guildMember.roles.cache.values()).map(role => role.name);
        if (!(roles.includes(conf().Discord.AdminRole) ||
                guildMember.hasPermission("MANAGE_GUILD") ||
                guildMember.hasPermission("ADMINISTRATOR"))) {
            await message.channel.send(`Only ${conf().Discord.AdminRole} allowed to use this command.`);
            return;
        }
        Logger.log("info", "displaying all users in registeredUsers collection");
        var output = JSON.stringify(auth.getUsers(), null, 4);
        var DISCORD_TEXT_LIMIT = 2000;
        while (output.length > DISCORD_TEXT_LIMIT) {
            await message.channel.send(output.substring(0, DISCORD_TEXT_LIMIT - 1));
            output = output.substring(DISCORD_TEXT_LIMIT);
        }
        await message.channel.send(output);
        break;
    case "!delete_user":
        var nick = command.join(" ");
        nick = nick.trim();
        var guildMember = message.member;
        var roles = Array.from(guildMember.roles.cache.values()).map(role => role.name);
        if (!(roles.includes(conf().Discord.AdminRole) ||
                guildMember.hasPermission("MANAGE_GUILD") ||
                guildMember.hasPermission("ADMINISTRATOR"))) {
            await message.channel.send(`Only ${conf().Discord.AdminRole} allowed to use this command.`);
            return;
        }
        Logger.log("info", `About to delete user ${nick}`);
        if (message.mentions.users.size > 0) {
            var messageMentions = message.mentions;
            if (messageMentions.users.size > 1) {
                Logger.log("info", "Too many users mentioned.");
                await message.channel.send("Please only supply one user.");
                return;
            }
            for (let [id, user] of messageMentions.users) {
                var user_details = { name: name };
                auth.deleteUser(id);
            }
            await message.channel.send("Command completed.");
        } else {
            userfunction.findUidByNick(nick, client).then(async (id) => {
                if (id === -1) {
                    await message.channel.send(USER_NOT_FOUND_MESSAGE);
                } else if (id === -2) {
                    await message.channel.send("There were multiple matches for that nickname. Please use the @ mention.");
                } else {
                    auth.deleteUser(id);
                    await message.channel.send("Command completed.");
                }
            });
        }
        break;
    case "!register":
        Logger.log("info", "Received register request");
        var params = command.join(" ").split(",");
        var realName = params[0];
        if (realName === "") {
            await message.channel.send("Please provide a real name.");
            return;
        }
        var fresher = false;
        if (params.length >= 2) {
            var fresherStr = params[1].trim().toLowerCase().replace(/"/g, "");
            if (["yes", "no"].indexOf(fresherStr) === -1) {
                await message.channel.send(`${params[1]} is not a valid second argument. Please enter "yes" if you are a fresher, "no" otherwise.`);
                return;
            }
            fresher = fresherStr === "yes";
        }
        var identification = "";
        if (params.length > 2) {
            identification = params.slice(2).join(",");
        } else if (message.attachments.size > 0) {
            let attachmentIterator = message.attachments.values();
            let attachment = attachmentIterator.next();
            while (!attachment.done) {
                identification += attachment.value.url + " ";
                attachment = attachmentIterator.next();
            }
        }
        var channelName = conf().Discord.AdminChannel;
        findChannel(channelName, client).then(async (channel) => {
            if (!channel) {
                Logger.log("info", `Could not find channel: ${channelName}`);
            } else {
                Logger.log("info", "Admin channel found. Sending message...");
                channel.send(`New user ${message.author.username} (real name apparently ${realName}, fresher: ${fresherStr}, identification provided: ${identification}) has requested to join the server.
If the user seems legitimate, please add them via:`);
                channel.send(`\`!insertuser ${message.author.username}, ${fresher ? "fresher" : "non-fresher"}, ${realName}\``);
                await message.channel.send(
                    `Thanks for registering! A ${conf().Discord.AdminRole} member should review your request shortly.
If your roles do not change within the next few hours, feel free to PM a ${conf().Discord.AdminRole}`);
            }
        });
        break;
    case "!HAKASE":
        if (command.length > 0) {
            hakase.interpretHakaseQuery(client, message);
        } else {
            message.channel.send("Hakase here! How can I help?").then(() => {
                message.channel.awaitMessages(m => m.author.id === message.author.id, { max: 1, time: 10000, errors: ["time"] })
                    .then(collected => {
                        hakase.interpretHakaseQuery(client, collected.first());
                    })
                    .catch(async error => {
                        console.log(error);
                        await message.channel.send("Hmph! Don't call me if you don't need me!");
                    });
            });
        }
        break;
    case "!fetch_users_json":
        var guildMember = message.member;
        var roles = Array.from(guildMember.roles.cache.values()).map(role => role.name);
        if (!(roles.includes(conf().Discord.AdminRole) ||
                guildMember.hasPermission("MANAGE_GUILD") ||
                guildMember.hasPermission("ADMINISTRATOR"))) {
            await message.channel.send(`Only ${conf().Discord.AdminRole} allowed to use this command.`);
            return;
        }
        Logger.log("info", "uploading users.json");
        message.channel.send({ files: ["users.json"] })
            .then()
            .catch(error => Logger.log("info", "Unable to upload users.json. Error: " + error));
        break;
    case "!help":
        let query = new Discord.Message(client, null, message.channel);
        query.content = query.cleanContent = "help";
        hakase.interpretHakaseQuery(client, query);
        break;
    }
};

function findChannel(channelName, client) {
    Logger.log("info", `Looking for channel: ${channelName}`);
    return new Promise((resolve, reject) => {
        var guild = client.guilds.cache.get(conf().Discord.GuildId);
        var matches = guild.channels.cache.filter(channel => channel.name === channelName);
        if (matches.size !== 1) {
            resolve(undefined);
        } else {
            resolve(matches.first());
        }
    });
}

