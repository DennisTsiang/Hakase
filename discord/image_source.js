const conf = require("../config/conf");
const sagiri = require('sagiri');
const Logger = require("../logger/logger");
const Discord = require("discord.js");

module.exports.searchSauceNAO = async (message, client) => {
    if (message.author.id === client.user.id) {
        return;
    }
    let sauceNAO = null;
    try {
        let sauceNAOApiKey = conf().SauceNAO.apikey;
        if (sauceNAOApiKey == undefined || sauceNAOApiKey == "") {
            Logger.log("info", "Skipping reverse search as SauceNAO API Key not found.");
            return;
        }
        sauceNAO = sagiri(sauceNAOApiKey);
    } catch (err) {
        return;
    }
    const image = message.attachments.first();
    let results = await sauceNAO(image.url, { mask: [5, 6, 9, 18, 34] });
    results = results.filter(result => result.similarity >= 85);
    if (results.length == 0) {
        return;
    }
    let response = new Discord.Message(client, null, message.channel);
    pixivResult = results.find(result => result.site == 'Pixiv');
    if (pixivResult != undefined) {
        response.content = "Source: <" + pixivResult.url + ">";
    } else {
        results.sort(resultsCompareFn);
        response.content = "Source: <" + results[0].url + ">";
    }
    await message.channel.send(response)
        .then(msg => {
            let reactionCount = 0;
            const filter = (reaction) => {
                // The headpat emoji 
                return reaction.emoji.id === conf().Discord.EmojiReactID;
            };
            const collector = msg.createReactionCollector(filter, { time: 15 * 60 * 1000}); // Time is in milliseconds
            collector.on('collect', async (reaction) => {
                // Possible race conditions as this is asynchronous. May not be a problem in actual usage.
                Logger.log("info", "User reacted to message with emoji id: " + reaction.emoji.id);
                reactionCount += 1;
                if (reactionCount == 3) {
                    await message.channel.send("Hehe so many people are giving Hakase headpats~\nhttps://i.imgur.com/s41O1Zu.jpg");
                    collector.stop();
                }
            });
            collector.on('remove', async () => {
                reactionCount -= 1;
            });
        });
}

function resultsCompareFn(a, b) {
    if (a.similarity > b.similarity) {
        return -1;
    }
    if (a.similarity < b.similarity) {
        return 1;
    }
    return 0;
}