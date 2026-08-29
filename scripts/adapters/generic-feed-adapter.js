"use strict";
const fileAdapter = require("./json-file-adapter.js");
module.exports = Object.freeze({ adapterId:"generic-file", retailerId:null, displayName:"Generic approved JSON/CSV feed", requiredEnvironment:[], configured:()=>true, load:fileAdapter.load });
