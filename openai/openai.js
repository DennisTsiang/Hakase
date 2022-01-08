const Logger = require("../logger/logger");
const OpenAI = require('openai-api');
const conf = require("../config/conf");
const fs = require("fs");

const openAIParameters = {
    engine: 'curie',
    prompt: '',
    max_tokens: 150,
    temperature: 0.5,
    stream: false,
    stop: ['\n', '\r\n', "Human"]
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
}

module.exports.getOpenAICompletionResponse = async (input) => {
    openAIParameters.prompt = intialPrompt + "Human: " + input + "\r\n";
    const gptResponse = await openAIClient.complete(openAIParameters);
    console.log(gptResponse.data);
    let response = gptResponse.data.choices[0].text.replace("Hakase: ", "");
    if (response == "") {
        return "Sorry Hakase is busy right now. Go ask Nano instead."
    }
    return response;
}