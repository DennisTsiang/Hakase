const Promise = require("promise");
const Logger = require("../logger/logger");

const conf = require("../config/conf");
const auth = require("../user/auth");
const userfunction = require("../user/user");
const Discord = require("discord.js");
const hakase = require("./hakase_responses");

const USER_NOT_FOUND_MESSAGE = "Hakase couldn't find such a user with that nickname! Hakase will have to ask Nano about it when she gets home!";

module.exports.handleCom = async (message, client) => {
    var command = message.cleanContent.split(' ');
    var op = command.shift();
    switch (op) {
        case "!whois":
            var nick = command.join(' ').trim();
            Logger.log("info", `Now executing whois query on user ${nick}`);
            var hakaseRegex = /@?(h|H)akase$/;
            var nanoRegex = /(n|N)ano$/
            if (nick == "Bot Guildy") {
                await message.channel.send(`We don't speak of the dead.`)
                return;
            } else if (hakaseRegex.test(nick)) {
                await message.channel.send("https://tinyurl.com/y4ajka9t");
                return;
            } else if (nanoRegex.test(nick)) {
                await message.channel.send("https://tinyurl.com/vqxzcwv");
                return;
            } else if (nick.match(/(S|s)akamoto/)) {
                await message.channel.send("https://tinyurl.com/wazrt5t");
                return;
            }
            findUidByNick(nick, client)
                .then(async id => {
                    if (id === -1) {
                        // Perform an inverse lookup
                        findUidByRealName(nick)
                            .then(async (matches) => {
                                if (matches.length == 0) {
                                    await message.channel.send(USER_NOT_FOUND_MESSAGE);
                                    await message.channel.send({ files: ["images/hakase_sad.gif"] })
                                        .catch(error => Logger.log("info", "Unable to find image to send"));
                                } else if (matches.length > 1) {
                                    await message.channel.send("There were multiple matches for that real name. This is disconcerting.");
                                } else {
                                    var guild = client.guilds.cache.get(conf().Discord.GuildId);
                                    guild.members.fetch(matches[0][0])
                                        .then(async guildMember => {
                                            await message.channel.send(`${nick}'s Discord username is ${guildMember.nickname ? guildMember.nickname : guildMember.user.username}.`);
                                        })
                                        .catch(err => Logger.log("info", "Unable to find guildMember. Error: " + err));
                                }
                            });
                    } else if (id === -2) {
                        await message.channel.send("There were multiple matches for that nickname. This is disconcerting.");
                    } else {
                        var realName = auth.getRealName(id);
                        await message.channel.send(`${nick}'s real name is ${realName}.`);
                    }
                });
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
            var params = command.join(' ').split(',');
            if (params.length !== 2) {
                await message.channel.send("Incorrect number of arguments. Please supply arguments as [discord name], [real name]");
                return;
            }
            var nick = params[0];
            var name = params[1];
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
                    Logger.log("info", "Too many users mentioned.")
                    await message.channel.send("Please only supply one user.");
                    return;
                }
                for (let [id, user] of messageMentions.users) {
                    var user_details = { name: name };
                    auth.addUser(id, user_details);
                    userfunction.addRoleByUserId(conf().Discord.MemberRole, id, client);
                }
                await message.channel.send("Command completed.");
            } else {
                findUidByNick(nick, client).then(async (id) => {
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
            var nick = command.join(' ');
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
                    Logger.log("info", "Too many users mentioned.")
                    await message.channel.send("Please only supply one user.");
                    return;
                }
                for (let [id, user] of messageMentions.users) {
                    var user_details = { name: name };
                    auth.deleteUser(id);
                }
                await message.channel.send("Command completed.");
            } else {
                findUidByNick(nick, client).then(async (id) => {
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
            Logger.log("info", "Received register request")
            var params = command.join(' ').split(',');
            var realName = params[0];
            var identification = "";
            if (params.length > 1) {
                identification = params[1];
            }
            if (realName === "") {
                await message.channel.send("Please provide a real name");
                return;
            }
            var blacklist = ["Bot Guildy", "@Bot Guildy"];
            if (blacklist.includes(nick)) {
                Logger.log("info", `There was an attempt to register an invalid user: ${nick}`);
                await message.channel.send(`There was an attempt to add an invalid user: ${nick}`);
                return;
            }
            var channelName = conf().Discord.AdminChannel;
            findChannel(channelName, client).then(async (channel) => {
                if (!channel) {
                    Logger.log("info", `Could not find channel: ${channelName}`)
                } else {
                    Logger.log("info", "Admin channel found. Sending message...")
                    channel.send(`New user ${message.author.username} (real name apparently ${realName}, identification provided: ${identification}) has requested to join the server.
If the user seems legitimate, please add them via \`!insertuser ${message.author.username}, ${realName}\``);
                    await message.channel.send(
                        `Thanks for registering! A ${conf().Discord.AdminRole} member should review your request shortly.
If your roles do not change within the next hour, feel free to PM a ${conf().Discord.AdminRole}`);
                }
            });
            break;
        case "!HAKASE":
            message.channel.send(`Hakase here! How can I help?`).then(() => {
                message.channel.awaitMessages(m => m.author.id === message.author.id, { max: 1, time: 10000, errors: ['time'] })
                    .then(collected => {
                        hakase.interpretHakaseQuery(client, collected.first());
                    })
                    .catch(async error => {
                        console.log(error);
                        await message.channel.send("Hmph! Don't call me if you don't need me!");
                    });
            });
            break;
        case "!fetch_users_json":
            var guildMember = message.member;
            var roles = Array.from(guildMember.roles.cache.values()).map(role => role.name);
            if (!(roles.includes(conf().Discord.AdminRole) ||
                guildMember.hasPermission("MANAGE_GUILD") ||
                guildMember.hasPermission("ADMINISTRATOR"))) {
                await message.channel.send(`Only ${conf().Discord.AdminRole} allowed to use this command.`)
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

function findUidByNick(name, client) {
    return new Promise((resolve, reject) => {
        var guild = client.guilds.cache.get(conf().Discord.GuildId);
        guild.fetch()
            .then(fetchedGuild => {
                var ulist = fetchedGuild.members.fetch();
                if (name.charAt(0) == '@') {
                    name = name.substring(1);
                }
                Logger.log("info", `Searching for ${name}`)
                ulist.then((membersMap) => {
                    var matches = Array.from(membersMap.values()).filter((member, key) => {
                        return member.nickname == name || member.user.username == name;
                    });
                    if (matches.length > 1) {
                        resolve(-2);
                    } else if (matches.length == 0) {
                        resolve(-1);
                    } else {
                        Logger.log("info", `Found matching id: ${matches[0].id}`);
                        resolve(matches[0].id);
                    }
                });
            });
    });
}

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

function findUidByRealName(name) {
    return new Promise((resolve, reject) => {
        let matches = Object.entries(auth.getUsers()).filter(entry => entry[1].name === name);
        resolve(matches);
    });
}

