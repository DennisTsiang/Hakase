const Logger = require("../logger/logger");
const request = require('request');
const Discord = require("discord.js");
const OpenAI = require("../openai/openai");

module.exports.interpretHakaseQuery = async (client, message) => {

    let query = message.content.toLowerCase();
    if (query.startsWith("!hakase ")) {
        query = query.replace("!hakase ", "");
    }
    /* Table of tuples representing a basic Hakase query and response.
    First param - boolean condition
    Second param - Logging text
    Third param - Callback to execute
    */
    const queryTable = [
        [
            query == "meow" || query.includes("nya"),
            "Received meow request",
            () => { return message.channel.send("https://tinyurl.com/y2mlo33q"); }
        ],
        [
            query == "dance",
            "Received dance request",
            () => { return message.channel.send("https://tinyurl.com/yyulqpeg"); }
        ],
        [
            query == "shark",
            "Received shark request",
            () => { return message.channel.send("https://tinyurl.com/yybbw6au"); }
        ],
        [
            query.includes("sleep"),
            "Received sleep request",
            () => { return message.channel.send("But I don't wanna!\nhttps://tinyurl.com/y5xmjyuo"); }
        ],
        [
            query == "have a roll cake",
            "Received roll cake request",
            () => { return message.channel.send("Thank you!\nhttps://tinyurl.com/y8h4docz"); }
        ],
        [
            query.match(/(G|g)ood bot.?/),
            "",
            () => {
                if (message.cleanContent.toLowerCase().startsWith("!hakase"))
                {
                    return message.channel.send("Eheheh thank you!\nhttps://tinyurl.com/w6zoctl");
                }
                message.channel.messages.fetch({ limit: 2 })
                .then(async messageMappings => {
                    let messages = Array.from(messageMappings.values());
                    let previousMessage = messages[1];
                    if (previousMessage.author.id != client.user.id) {
                        return message.channel.send("Eheheh thank you!\nhttps://tinyurl.com/w6zoctl");
                    }
                })
                .catch(error => Logger.log("error", "Error fetching messages in channel"));
            }
        ],
        [
            query.match(/(B|b)ad bot.?/),
            "",
            () => {
                if (message.cleanContent.toLowerCase().startsWith("!hakase"))
                {
                    return message.channel.send("O-oh okay...Hakase was only trying her best. Please don't hurt Hakase. \nhttps://tinyurl.com/y95vkqar");
                }
                message.channel.messages.fetch({ limit: 2 })
                .then(async messageMappings => {
                    let messages = Array.from(messageMappings.values());
                    let previousMessage = messages[1];
                    if (previousMessage.author.id != client.user.id) {
                        return message.channel.send("O-oh okay...Hakase was only trying her best. Please don't hurt Hakase. \nhttps://tinyurl.com/y95vkqar");
                    }
                })
                .catch(error => Logger.log("error", "Error fetching messages in channel"));
            }
        ],
        [
            query.startsWith("Hakase is"),
            "Received adjective request",
            () => {
                if (containsPraiseWords(query) && !containsBlameWords(query) ||
                    containsPraisePhrases(query)) {
                    return message.channel.send("Ehehehe~ your praise making me blush.\nhttps://tinyurl.com/w6zoctl");
                } else {
                    return message.channel.send("https://tinyurl.com/y2qev36j");
                }
            }
        ],
        [
            query == "jankenpon",
            "Received jankenpon request",
            () => {
                let clips = [
                    "https://gfycat.com/saltyunfoldedechidna",
                    "https://gfycat.com/sarcasticconsciousivorybilledwoodpecker",
                    "https://gfycat.com/heartysolidanchovy",
                    "https://gfycat.com/livetenseelephantseal",
                    "https://gfycat.com/pinkcheapgermanshorthairedpointer",
                    "https://gfycat.com/presentdefiantbantamrooster",
                ];
                let random = Math.floor(Math.random() * clips.length);
                let outcome = clips[random];
                return message.channel.send(outcome);
            }
        ],
        [
            query == "play that funky music",
            "received funky music request",
            () => { return message.channel.send("https://youtu.be/WP6DJfhPQTg"); }
        ],
        [
            query.match(/^(Will|Is|Should|Am I) (\w+ ?)+\?/i),
            "received magic 8 ball request",
            () => { return message.channel.send(yesNoResponses[Math.floor(Math.random() * yesNoResponses.length)]); }
        ],
        [
            query == "help",
            "received command help request",
            () => {
                const embedHelp = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Hakase help commands')
                .setDescription('List of available commands for Hakase. Arguments of the form <arg> are mandatory and to be replaced with appropriate text. Arguments of the form [arg] are optional.')
                .addFields(
                    { name: '!whois <discord username or nickname>', value: 'Return real name of discord user. Only works if their name has been added to the database. Also accepts @ mentions.' },
                    { name: '!whois <full real name>', value: 'Returns the discord username that corresponds to their full real name. Only if their name has been added to the database.' },
                    { name: '!insertuser <discord username>, <full real name>', value: 'See !insert_user' },
                    { name: '!insert_user  <discord username>, <full real name>', value: 'Adds someone to the name database. On successful insert, the user will be granted member role.' },
                    { name: '!list_users', value: 'Returns name database entries in a JSON formatted string. Requires permissions to invoke.' },
                    { name: '!delete_user <discord username>', value: 'Deletes an entry from the name database. Requires permissions to invoke.' },
                    { name: '!register <full real name>, [identification]', value: 'Sends a message to admin channel so that admins can verify user.' },
                    { name: '!fetch_users_json', value: 'Sends the name database as a JSON file. Requires permissions to invoke.' },
                    { name: '!HAKASE', value: 'Call upon Hakase.' },
                )
                .attachFiles("images/Hakase_avatar.png")
                .setThumbnail("attachment://Hakase_avatar.png")
                .setTimestamp();
                return message.channel.send(embedHelp);
            }
        ],
        [
            query.startsWith("monkerate"),
            "received monkerate request",
            () => {
                const words = query.toString().split(" ");
                let name = "";
                if (words.length > 1) {
                    name = words[1];
                }
                let percentage = Math.random().toFixed(2) * 100;
                let response = "According to Hakase's genius calculations ";
                response += name.length > 0 ? name + " is " : "you are "; 
                response += `${percentage}% monke! 🐒`;
                if (percentage > 75) {
                    response += "\nhttps://i.imgur.com/fw3295k.gif";
                }
                return message.channel.send(response);
            }
        ],
        [
            query.startsWith("gif"),
            "received gif request",
            () => {
                let urlQuery = encodeURI(query.replace("gif ", ""));
                request('https://api.gfycat.com/v1/gfycats/search?search_text=' + urlQuery, { json: true }, async (err, res, body) => {
                    if (err) {
                        Logger.warn(err);
                        return message.channel.send("Sorry Hakase is busy right now. Go ask Nano instead.");
                    }
                    let gifs = body["gfycats"];
                    if (gifs == undefined) {
                        return;
                    }
                    gifs.sort(gfycatSearchResultCompare);
                    for (let gif of gifs) {
                        if (gif["nsfw"] == "0") {
                            return message.channel.send(gif["max5mbGif"]);
                        }
                    }
                });
            }
        ]
    ];

    for (let queryResponse of queryTable) {
        if (queryResponse[0]) {
            Logger.log("info", queryResponse[1]);
            await queryResponse[2]();
            return;
        }
    }

    Logger.log("info", "Received unknown request. Trying OpenAI GPT-3 response...");
    if (!OpenAI.initialiseEngine()) {
        return;
    }
    let queryResponse = await OpenAI.getOpenAICompletionResponse(query);
    return message.channel.send(queryResponse);
};

function gfycatSearchResultCompare(a, b) {
    let aRank = parseInt(a["likes"]) + parseInt(a["views"]);
    let bRank = parseInt(b["likes"]) + parseInt(b["views"]);
    if (aRank > bRank) {
        return -1;
    } else if (aRank < bRank) {
        return 1;
    } else {
        return 0;
    }

}

function containsPraisePhrases(message) {
    const praisePhrases = ["the best", "best girl", "best waifu"];
    let messageWords = message.toLowerCase().split(" ");
    let desc = messageWords.slice(2).join(" ");
    for (praisePhrase of praisePhrases) {
        if (desc.match(new RegExp(praisePhrase + "!\?"))) {
            return true;
        }
    }
    return false;
}

function containsPraiseWords(message) {
    const praiseWords = ["cute", "kawaii", "good", "great", "amazing", "excellent"];
    return containsWordsWithNoNegation(message, praiseWords);
}

function containsBlameWords(message) {
    const blameWords = ["bad", "crap", "shit", "broken"];
    return containsWordsWithNoNegation(message, blameWords);
}

function containsWordsWithNoNegation(message, words) {
    let messageWords = message.toLowerCase().split(" ");
    let prevWord = "";
    for (messageWord of messageWords) {
        for (word of words) {
            if (messageWord.toLowerCase().includes(word) && prevWord != "not" && prevWord != "no") {
                return true;
            }
        }
        prevWord = messageWord;
    }
    return false;
}

let yesNoResponses = [
    "As I see it, yes!",
    "Ask again later. Hakase is busy right now",
    "Huhuhu. Better not tell you now.",
    "Cannot predict right now. Hakase needs milk first!",
    "Hakase can't understand such hard questions! Concentrate and ask again!",
    "Hpmh! Don’t count on it.",
    "It is certain. Hakase believes!",
    "It is decidedly so desu.",
    "Most likely desu.",
    "My reply is no.",
    "I asked Sakamoto and he says no.",
    "Outlook not so good!",
    "Outlook good!",
    "Reply hazy, try again later!",
    "All signs point to yes.",
    "Very doubtful.",
    "Without a doubt!",
    "Yes!",
    "Yes – definitely!",
    "You may rely on it.",
];