/**
 * Created by Callum on 21/11/2016.
 */

const http = require('http');
const url = require("url");
const winston = require("winston");

const auth = require("../user/auth");
const conf = require("../config/conf");

module.exports.startServer = function(dClient) {
    winston.log("debug", "Creating server object...");
    const server = http.createServer((req, res) => {requestHandler(req, res, dClient);});

    server.listen(conf().Web.Port, (err) => {
        if (err) {
            winston.log("error", "Could not start listening for connections due to error " + err);
            return err
        }
        winston.log("info", `server is listening on port ${conf().Web.Port}`)
    });
};

const requestHandler = function(req, resp, dClient) {
    var uri = url.parse(req.url, true);
    var path = uri.pathname.split('/');
    switch (path[1]){
        case "register":
            winston.log("info", `Got signin response for uid ${path[2]}`)
            auth.processResponse(path[2], uri.query, dClient);
            
        default:
            winston.log("warning", `No handler exists for request ${path}`)
    }
    
    //Respond to client
    resp.statusCode = 200;
    resp.end("Done (yay!)");
};