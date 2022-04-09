const Logger = require("../logger/logger");
const OpenAI = require("openai-api");
const conf = require("../config/conf");
const fs = require("fs");

const contentFilterParameters = {
    engine: "content-filter-alpha",
    prompt: "",
    temperature: 0,
    max_tokens: 1,
    top_p: 0,
    logprobs: 10
};

const openAIParameters = {
    engine: "curie",
    prompt: "",
    max_tokens: 150,
    temperature: 0.5,
    stream: false,
    user: "",
    stop: ["\n", "\r\n", "Human"]
};

const rateLimit = {
    minute: 0,
    numberOfRequestsMade: 0,
};

let intialPrompt = null;
let openAIClient = null;

module.exports.initialiseEngine = () => {
    if (openAIClient) {
        return true;
    }
    try {
        // Note paths must be relative to the entry js script.
        const OPENAI_API_KEY = conf("./config/conf.json").OpenAI.APIKey;
        openAIClient = new OpenAI(OPENAI_API_KEY);
        intialPrompt = fs.readFileSync("./openai/model_prompt.txt");
    } catch (e) {
        Logger.log("error", "Failed to initialise OpenAI connection\n" + e);
        return false;
    }
    return true;
};

async function getContentFilterResponse(prompt) {
    contentFilterParameters.prompt = "<|endoftext|>" + prompt + "\n--\nLabel:";
    const gptResponse = await openAIClient.complete(contentFilterParameters);

    let output_label = gptResponse.data.choices[0].text;
    if (output_label == "2") {
        logprobs = gptResponse.data.choices[0].logprobs.top_logprobs[0];

        /* This is the probability at which we evaluate that a "2" is likely real
           vs. should be discarded as a false positive. Value taken from OpenAI docs */
        const toxic_threshold = -0.355;

        if (logprobs["2"] < toxic_threshold) {
            logprob_0 = logprobs.hasOwnProperty("0") ? logprobs["0"] : null;
            logprob_1 = logprobs.hasOwnProperty("1") ? logprobs["1"] : null;

            if (logprob_0 != null && logprob_1 != null) {
                if (logprob_0 >= logprob_1) {
                    return 0;
                } else {
                    return 1;
                }
            } else if (logprob_0 != null) {
                return 0;
            } else if (logprob_1 != null) {
                return 1;
            } else {
                return 2;
            }
        }
    }
    if (!["0", "1", "2"].includes(output_label)) {
        return 2;
    }
    return parseInt(output_label);
}

module.exports.getOpenAICompletionResponse = async (userID, input) => {
    const MAX_REQUESTS_PER_MINUTE = 10;
    let date = new Date();
    let minute = date.getMinutes();
    if (rateLimit.minute != minute) {
        rateLimit.minute = minute;
        rateLimit.numberOfRequestsMade = 0;
    }
    if (rateLimit.numberOfRequestsMade >= MAX_REQUESTS_PER_MINUTE) {
        return "You're asking Hakase too many questions! Give Hakase time to breathe! >_<";
    } else {
        rateLimit.numberOfRequestsMade += 1;
    }

    // Send no more than 1000 characters per request as per usage guidelines
    if (input.length > 1000) {
        input = input.slice(0, 1000);
    }

    const contentFilterLabel = await getContentFilterResponse(input);
    if (contentFilterLabel == 2) {
        return "Sorry Hakase is busy right now. Go ask Nano instead.";
    }

    openAIParameters.prompt = intialPrompt + "Human: " + input + "\r\n";
    openAIParameters.user = userID;
    const gptResponse = await openAIClient.complete(openAIParameters);
    console.log(gptResponse.data);
    let response = gptResponse.data.choices[0].text.replace("Hakase: ", "");
    if (response == "") {
        return "Sorry Hakase is busy right now. Go ask Nano instead.";
    }
    return response;
};