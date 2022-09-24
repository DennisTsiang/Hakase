const Logger = require("../logger/logger");
const fs = require("fs");
const promiseRetry = require("promise-retry");

const conf = require("../config/conf");
const auth = require("./auth");

// Please note the bot's unique role must be higher than whatever role you are trying to assign, and it must have permissions to manage roles.
module.exports.addRoleByUserId = (rolename, id, client) => {
    var MAX_RETRIES = 3;
    var role = getRoleByName(rolename, client);
    client.guilds.cache.get(conf().Discord.GuildId).members.fetch(id)
        .then((member) => {
            let roles = Array.from(member.roles.cache.values()).map(role => role.name);
            if (!roles.includes(rolename)) {
                promiseRetry(function (retry, number) {
                    return member.roles.add(role)
                        .then(() => Logger.log("info", `Gave user ${member.user.username} the role ${rolename}`),
                            (err) => {
                                Logger.log("info", "Could not assign role");
                                retry(err);
                            }
                        );
                }, { retries: MAX_RETRIES })
                    .catch((err) => Logger.log("info", `${err.name}: ${err.message}`));
            }
        });
};

function getRoleByName(rolename, client) {
    var guild = client.guilds.cache.get(conf().Discord.GuildId);
    var role = Array.from(guild.roles.cache.values()).find(role => role.name === rolename);
    return role;
}

module.exports.findUidByNick = (name, client) => {
    return new Promise((resolve, reject) => {
        var guild = client.guilds.cache.get(conf().Discord.GuildId);
        guild.fetch()
            .then(fetchedGuild => {
                if (name.charAt(0) == "@") {
                    name = name.substring(1);
                }
                Logger.log("info", `Searching for ${name}`);
                fetchedGuild.members.fetch()
                    .then((membersMap) => {
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
                    })
                    .catch((error) => {
                        Logger.log("error", `${error.code}: ${error.message}`);
                        reject(-1);
                    });
            });
    });
};


module.exports.findUidByRealName = (name) => {
    return new Promise((resolve, reject) => {
        let matches = Object.entries(auth.getUsers()).filter(entry => entry[1].name === name);
        resolve(matches);
    });
};