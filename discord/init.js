const { Client, GatewayIntentBits, Partials, ChannelType } = require("discord.js");
const Logger = require("../logger/logger");
const Promise = require("promise");
const conf = require("../config/conf");
const interpreter = require("./interpreter");
const image_source = require("./image_source");
const youtubedl = require("youtube-dl-exec");
const twittertext = require("twitter-text");
const hakase_responses = require("./hakase_responses");
const { commandsTable } = require("./slash_commands.js");

exports.connect = function () {
    return new Promise(function (resolve, reject) {
        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildPresences
            ],
            partials: [
                Partials.User, // We want to receive uncached users!
                Partials.Message, // We want to receive uncached messages!
                Partials.Channel // Needed for direct messages
            ]
        });

        Logger.log("info", "Connecting to Discord...");
        client.login(conf().Discord.APIKey);

        //Setting up initial connection
        client.on("ready", function () {
            Logger.log("info", "Connected to server!");
            getRoleIds(client);
            resolve(client);
        });

        //When a member joins the server
        client.on("guildMemberAdd", function (newMember) {
            if (conf().Discord.PostWelcomeMessage)
            {
                newMember.send(welcomeMessage(newMember.user));
            }
        });

        //When a member messages bot
        client.on("messageCreate", async function (message) {
            if (message.author.bot) {
                return;
            }
            if (message.cleanContent.startsWith("HAKASE HAKASE HAKASE")) {
                if (message.channel.type == ChannelType.DM) {
                    var newMember = message.author;
                    if (conf().Discord.PostWelcomeMessage)
                    {
                        newMember.send(welcomeMessage(newMember));
                    }
                } else {
                    await message.channel.send("https://tinyurl.com/y3os3kk3");
                }
            } else if (message.cleanContent.toLowerCase() == "help") {
                if (message.channel.type == ChannelType.DM)
                {
                    Logger.log("info", "Got a command, now executing...");
                    message.cleanContent = message.content = "!help";
                    interpreter.handleCom(message, client);
                }
            } else if (message.cleanContent.charAt(0) == "!") {
                Logger.log("info", "Got a command, now executing...");
                interpreter.handleCom(message, client);
            } else if (conf().Discord.ImageChannels.includes(message.channel.name) && message.attachments.size == 1
                && !containsURL(message)) {
                Logger.log("info", "Found an image in image channel");
                image_source.searchSauceNAO(message, client);
            } else if (false && !message.channel.nsfw && message.cleanContent.includes("://twitter.com/")) {
                await handleTwitterVideo(client, message);
            } else if (message.cleanContent.toLowerCase().match(/(G|g)ood bot.?$/)) {
                message.channel.messages.fetch({ limit: 2 })
                    .then(async messageMappings => {
                        let messages = Array.from(messageMappings.values());
                        let previousMessage = messages[1];
                        if (previousMessage.author.id == client.user.id) {
                            await message.channel.send(hakase_responses.good_bot_message);
                        }
                    })
                    .catch(error => Logger.log("error", "Error fetching messages in channel"));
            } else if (message.cleanContent.toLowerCase().match(/(B|b)ad bot.?$/)) {
                message.channel.messages.fetch({ limit: 2 })
                    .then(async messageMappings => {
                        let messages = Array.from(messageMappings.values());
                        let previousMessage = messages[1];
                        if (previousMessage.author.id == client.user.id) {
                            await message.channel.send(hakase_responses.bad_bot_message());
                        }
                    })
                    .catch(error => Logger.log("error", "Error fetching messages in channel"));
            }
        });

        client.on("interactionCreate", async interaction => {
            if (!interaction.isChatInputCommand()) return;
        
            const { commandName } = interaction;
            Logger.log("info", `Received command ${commandName}`);

            if (commandsTable.has(commandName)) {
                await interaction.deferReply();
                var response_cb = commandsTable.get(commandName);
                await response_cb(interaction);
            }
        });

    });
};

function welcomeMessage(newMember) {
    return `Welcome to the server, ${newMember.username}!

To complete your registration into our server please direct message Hakase with the following

!register [Your real first and last name], [Type "yes" if you are a fresher, else "no"], [Some form of identification e.g. ${conf().Verification.join(", ")}]

For example: \`!register Hakase Shinonome, yes, http://imgur.com/link.to.photo.of.your.imperial.id\`
You may also upload a photo to Discord as part of the message too.

Once a ${module.exports.admin.toString()} member confirms your identity, you will be given permissions to join the other channels. 

If your roles do not change within a few hours, please try registering again (we might have just missed you, sorry!).

If it has been 24 hours feel free to message a ${module.exports.admin.toString()} member.
- Hakase`;
}

function getRoleIds(client) {
    var rolesManager = client.guilds.cache.get(conf().Discord.GuildId).roles;
    rolesManager.fetch()
        .then(roles => {
            var adminRoles = [];
            var memberRoles = [];
            roles.forEach((role, key) => {
                if (role.name == conf().Discord.AdminRole) {
                    adminRoles.push(role);
                } else if (role.name == conf().Discord.MemberRole) {
                    memberRoles.push(role);
                }
            });

            if (memberRoles.length != 1) {
                Logger.log("error", `MemberRole setting matches incorrect number of roles: ${JSON.stringify(memberRoles)}`);
                process.exit(-1);
            } else {
                module.exports.member = memberRoles[0].name;
            }
            if (adminRoles.length != 1) {
                Logger.log("error", `AdminRole setting matches incorrect number of roles: ${JSON.stringify(adminRoles)}`);
                process.exit(-1);
            } else {
                module.exports.admin = adminRoles[0].name;
            }
        });
}

function containsURL(string) {
    return new RegExp("([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?").test(string);
}

async function handleTwitterVideo(client, message) {
    let twitterURLs = twittertext.extractUrls(message.cleanContent);
    let replacedAtLeastOne = false;
    let replacedURLs = [];
    for (let url of twitterURLs) {
        if (url.includes("fxtwitter.com")) {
            replacedURLs.push(url);
            continue;
        }
        try {
            let videoURL = await youtubedl(url, {
                "skip-download": true,
                "get-url": true
            });
            if (videoURL.includes("video.twimg.com")) {
                let fxtwitterURL = url.replace("twitter.com", "fxtwitter.com");
                replacedURLs.push(fxtwitterURL);
                replacedAtLeastOne = true;
            } else {
                replacedURLs.push(url);
            }
        } catch (e) {
            replacedURLs.push(url);
        }
    }
    if (!replacedAtLeastOne) {
        return;
    }
    let webhook = await message.channel.createWebhook("fxtwitter webhook");
    let userAvatarURL = message.author.displayAvatarURL();
    let nickname = message.member.displayName;
    await message.delete();
    await webhook.send(replacedURLs.join("\n"), {
        username: nickname,
        avatarURL: userAvatarURL,
    });
    await webhook.delete();
}
