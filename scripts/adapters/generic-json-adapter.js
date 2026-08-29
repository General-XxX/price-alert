"use strict";
const fileAdapter = require("./json-file-adapter.js");
module.exports = Object.freeze({ adapterId:"generic-json", retailerId:null, displayName:"Generic approved JSON feed", requiredEnvironment:[], configured:()=>true, load:fileAdapter.load });
