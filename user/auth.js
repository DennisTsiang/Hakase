const Logger = require("../logger/logger");
const fs = require("fs");
const ImageKit = require("imagekit");
const conf = require("../config/conf");
const Axios = require("axios");

var registeredUsers = {};
var imageKit = null;

module.exports.loadUsers = async () => {
    if (conf().ImageKit.Enabled) {
        imageKit = new ImageKit({
            publicKey : conf().ImageKit.PublicKey,
            privateKey : conf().ImageKit.APIKey,
            urlEndpoint : conf().ImageKit.URLEndpoint,
        });
        await imageKit.purgeCache(conf().ImageKit.URLEndpoint + "/users.json")
            .catch(error => {
                Logger.log("error", "Failed to purge ImageKit cache for users.json. Response body:");
                console.log(error);
            });
        var userJsonURL = imageKit.url({
            path : "/users.json",
            queryParameters : {
                "v" : "123"
            },
            signed : true,
            expireSeconds : 30
        });
        response = await Axios.get(userJsonURL)
            .catch(function (error) {
                // handle error
                console.log(error);
            });
        // Axios automatically converts data to JSON objects
        registeredUsers = response.data;
        Logger.log("info", "Loaded user data from ImageKit");
    } else {
        var loaded = fs.readFileSync(conf().App.UserSaveLoc);
        registeredUsers = JSON.parse(loaded);
    }
};

module.exports.getRealName = (id) => {
    var user = registeredUsers[id];
    var name = user ? user.name : "undefined";
    return name;
};

module.exports.addUser = async (did, user_details) => {
    Logger.log("info", `Associating discord user ${did} with details ${JSON.stringify(user_details)}`);
    registeredUsers[did] = user_details;
    if (conf().ImageKit.Enabled) {
        var jsonBuffer = Buffer.from(JSON.stringify(registeredUsers));
        var jsonBase64 = jsonBuffer.toString("base64");
        var response = await imageKit.upload({
            file: jsonBase64,
            fileName: "users.json",
            isPrivateFile: true,
            useUniqueFileName: false,
            overwriteFile: true
        }).catch(error => {
            console.log(error);
        });
        Logger.log("info", "Uploaded user.json to ImageKit. Response body:");
        console.log(response);
    } else {
        fs.writeFile(conf().App.UserSaveLoc, JSON.stringify(registeredUsers), (err) => {
            if (err) {
                Logger.log("warning", `Failed to save file due to error ${err}`);
            }
        });
    }
};

module.exports.getUsers = () => {
    return registeredUsers;
};

module.exports.deleteUser = (did) => {
    Logger.log("info", `Deleting discord user ${did}`);
    delete registeredUsers[did];
    fs.writeFile(conf().App.UserSaveLoc, JSON.stringify(registeredUsers), (err) => {
        if (err) {
            Logger.log("warning", `Failed to save file due to error ${err}`);
        }
    });
};

module.exports.getNames = () => {
    let names = [];
    for (let [uid, values] of Object.entries(registeredUsers)) {
        names.push(values.name);
    }
    return names;
};
