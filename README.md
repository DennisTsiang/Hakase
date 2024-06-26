# Hakase

## API
All commands are prefixed with an exclamation mark.

`whois` - Returns the real name of a user

Examples
```
!whois @Harold
!whois Harold
```
`insert_user` - Inserts a new user into the user catalogue.

Examples
```
!insert_user @covfefe, Donald Trump
!insert_user covfefe, Donald Trump
```
`list_users` - Lists all registered users

`delete_user` - Deletes a user from the user catalogue.

Examples
```
!delete_user @covfefe, Donald Trump
!delete_user covfefe, Donald Trump
```

`fetch_users_json` - Sends the user.json file.

`register` - Sends a registration request
Examples
```
!register Donald Trump, 
!register Donald Trump, <some verification e.g. link to a driving license>
```
## Configuration file
Stored in `conf.json`

Example:
```
{
  "App" : {
    "UserSaveLoc" : "./users.json"
  },

  "Discord" : {
    "APIKey" : "The bot's secret token. This is not the client secret.",
    "AppId" : "The application's (bot's) ID. This is not the client ID"
    "GuildId" : "The guild's id",
    "AdminRole" : "Committee",
    "MemberRole" : "ICAS Members",
    "FresherRole": "Fresher",
    "AdminChannel" : "Channel to send register",
    "ImageChannels": [
      "name of image channel to have source reverse lookups made"
    ],
    "EmojiReactID": "395721719144251393"
  },

  "Verification": [
    "Your driving licence"
  ],

  "Web" : {
    "Address" : "http://localhost",
    "Port" : 8080
  },

  "SauceNAO": {
    "apikey": ""
  },

  "OpenAI": {
    "APIKey": ""
  },

  "ImageKit": {
    "Enabled": false,
    "APIKey": "",
    "PublicKey": "",
    "URLEndpoint": ""
  },
}

```
## Easy set-up

Easiest way to set this up is to use render.com for deployment. Choose node server and add 2 secret files.
One for `conf.json` and one for `users.json`. Only caveat is that `users.json` will revert every restart unless you have a storage plan. You can use ImageKit as an external storage host to store the users.json file.

To ensure the app doesn't go to sleep use cron-job.org to set up automatic jobs to ping the server.