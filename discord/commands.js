const userfunction = require("../user/user");
const Logger = require("../logger/logger");
const auth = require("../user/auth");

const USER_NOT_FOUND_MESSAGE = "Hakase couldn't find such a user with that nickname! Hakase will have to ask Nano about it when she gets home!";

async function whois(nick, client, response_cb)
{
    Logger.log("info", `Now executing whois query on user ${nick}`);
    if (nick == "Bot Guildy") {
        await response_cb("We don't speak of the dead.");
        return;
    } else if (nick.match(/@?(h|H)akase$/)) {
        await response_cb("https://tinyurl.com/y4ajka9t");
        return;
    } else if (nick.match(/(n|N)ano$/)) {
        await response_cb("https://tinyurl.com/vqxzcwv");
        return;
    } else if (nick.match(/(S|s)akamoto/)) {
        await response_cb("https://tinyurl.com/wazrt5t");
        return;
    }
    await userfunction.findUidByNick(nick, client)
        .then(async id => {
            if (id === -1) {
            // Perform an inverse lookup
                userfunction.findUidByRealName(nick)
                    .then(async (matches) => {
                        if (matches.length == 0) {
                            await response_cb(USER_NOT_FOUND_MESSAGE);
                            await response_cb({ files: ["images/hakase_sad.gif"] })
                                .catch(error => Logger.log("info", "Unable to find image to send"));
                        } else if (matches.length > 1) {
                            await response_cb("There were multiple matches for that real name. This is disconcerting.");
                        } else {
                            var guild = client.guilds.cache.get(conf().Discord.GuildId);
                            guild.members.fetch(matches[0][0])
                                .then(async guildMember => {
                                    await response_cb(`${nick}'s Discord username is ${guildMember.nickname ? guildMember.nickname : guildMember.user.username}.`);
                                })
                                .catch(err => Logger.log("info", "Unable to find guildMember. Error: " + err));
                        }
                    });
            } else if (id === -2) {
                await response_cb("There were multiple matches for that nickname. This is disconcerting.");
            } else {
                var realName = auth.getRealName(id);
                await response_cb(`${nick}'s real name is ${realName}.`);
            }
        })
        .catch(() => { return; });
}

module.exports = {
    whois
};