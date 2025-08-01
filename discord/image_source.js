const conf = require("../config/conf");
const sagiri = require("@kotosif/sagiri");
const Logger = require("../logger/logger");
const Discord = require("discord.js");

function containsURL(string) {
    return new RegExp("([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?").test(string);
}

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
    if (!image.contentType.includes("image"))
    {
        return;
    }
    let results = null;
    try {
        results = await sauceNAO(image.url, { mask: [5, 6, 9, 12, 21, 25, 34, 36, 37, 39, 41, 44] });
    } catch (err) {
        Logger.log("error", "Sagari SauceNao server encountered an error.");
        return;
    }
    results = results.filter(result => result.similarity >= 85);
    if (results.length == 0) {
        return;
    }
    let prioritySites = ["Pixiv", "deviantArt", "Twitter"];
    let imageResult = null;
    for (let site of prioritySites)
    {
        imageResult = results.find(result => result.site == site);
        if (imageResult != undefined || imageResult != null) {
            break;
        }
    }
    let response = "";
    if (imageResult != undefined || imageResult != null) {
        response = "Source: <" + imageResult.url + ">";
    } else {
        results.sort(resultsCompareFn);
        let mostSimilarResult = results[0];
        let source = mostSimilarResult.url;

        // For Booru sites check if the original source is listed
        if (mostSimilarResult.raw != undefined && mostSimilarResult.raw.data != undefined) {
            let rawData = mostSimilarResult.raw.data;
            if (rawData.source != undefined && containsURL(rawData.source)) {
                source = rawData.source;
            }
        }
        response = "Source: <" + source + ">";
    }
    await message.channel.send(response)
        .then(msg => {
            let reactionCount = 0;
            const filter = (reaction, user) => {
                // The headpat emoji 
                return reaction.emoji.id === conf().Discord.EmojiReactID;
            };
            const collector = msg.createReactionCollector({ filter, time: 15 * 60 * 1000}); // Time is in milliseconds
            collector.on("collect", async (reaction) => {
                // Possible race conditions as this is asynchronous. May not be a problem in actual usage.
                Logger.log("info", "User reacted to message with emoji id: " + reaction.emoji.id);
                reactionCount += 1;
                if (reactionCount == 3) {
                    await message.channel.send("Hehe so many people are giving Hakase headpats~\nhttps://i.imgur.com/s41O1Zu.jpg");
                    collector.stop();
                }
            });
            collector.on("remove", async () => {
                reactionCount -= 1;
            });
        });
};

function resultsCompareFn(a, b) {
    if (a.similarity > b.similarity) {
        return -1;
    }
    if (a.similarity < b.similarity) {
        return 1;
    }
    return 0;
}