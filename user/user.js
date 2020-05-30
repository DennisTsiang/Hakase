const Logger = require("../logger/logger");
const fs = require("fs");
const promiseRetry = require("promise-retry");

const conf = require("../config/conf");

// Please note the bot's unique role must be higher than whatever role you are trying to assign, and it must have permissions to manage roles.
module.exports.addRoleByUserId = (rolename, id, client) => {
  var MAX_RETRIES = 3;
  var role = getRoleByName(rolename, client);
  client.guilds.cache.get(conf().Discord.GuildId).members.fetch(id)
    .then((member) => {
      let roles = Array.from(member.roles.cache.values()).map(role => role.name);
      if (!roles.includes(rolename)) {

        promiseRetry(function (retry, number) {
          return member.edit({ roles: [role.id] })
            .then((result) => Logger.log("info", `Gave user ${member.user.username} the role ${rolename}`),
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
