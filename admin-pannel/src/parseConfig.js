import Parse from "parse"; // or "parse" for web

Parse.initialize("myAppId1", "myJavascriptKey"); // App ID, JS Key
Parse.serverURL = "https://parse.ronginlive.com/parse";
Parse.masterKey = "myMasterKey"; // only if needed client-side

export default Parse;