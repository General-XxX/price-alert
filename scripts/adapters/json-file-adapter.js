"use strict";
const fs = require("node:fs");
const path = require("node:path");

function load({ source, importer }) {
  const absolutePath = path.resolve(source);
  const contents = fs.readFileSync(absolutePath, "utf8");
  const format = path.extname(absolutePath).toLowerCase() === ".csv" ? "csv" : "json";
  let metadata = {};
  let importInput = contents;
  if (format === "json") {
    const parsed = JSON.parse(contents);
    if (!Array.isArray(parsed)) { metadata = parsed.metadata || {}; importInput = parsed.products || []; }
  }
  const imported = importer.importBatch(importInput, { format, dataStatus:metadata.dataStatus || "sample-development" });
  return { ...imported, metadata, adapter:"json-file", source:absolutePath };
}

module.exports = { adapterId:"json-file", load };
