"use strict";
const fileAdapter = require("./json-file-adapter.js");
module.exports = Object.freeze({ adapterId:"generic-csv", retailerId:null, displayName:"Generic approved CSV feed", requiredEnvironment:[], configured:()=>true, load:fileAdapter.load });
