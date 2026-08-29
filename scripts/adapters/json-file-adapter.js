"use strict";
const fs = require("node:fs");
const path = require("node:path");

function load({ source, importer }) {
  const absolutePath = path.resolve(source);
  const contents = fs.readFileSync(absolutePath, "utf8");
  const format = path.extname(absolutePath).toLowerCase() === ".csv" ? "csv" : "json";
  const imported = importer.importBatch(contents, { format, dataStatus:"sample-development" });
  return { ...imported, adapter:"json-file", source:absolutePath };
}

module.exports = { adapterId:"json-file", load };
