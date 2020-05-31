const conf = require("../config/conf");
const sagiri = require('sagiri');
const Logger = require("../logger/logger");

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
    results = results.filter(result => result.similarity > 90);
    if (results.length == 0) {
        return;
    }
    pixivResult = results.find(result => result.site == 'Pixiv');
    if (pixivResult != undefined) {
        await message.channel.send("Source: <" + pixivResult.url + ">");
        return;
    }
    results.sort(resultsCompareFn);
    await message.channel.send("Source: <" + results[0].url + ">");
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