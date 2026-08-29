"use strict";
const fs = require("node:fs");
const path = require("node:path");

function publishAtomically({ outputPath, products, report }) {
  const target = path.resolve(outputPath);
  const directory = path.dirname(target);
  const backupDirectory = path.join(directory, "backups");
  const temporary = path.join(directory, `.${path.basename(target)}.${process.pid}.tmp`);
  fs.mkdirSync(directory, { recursive:true });
  fs.mkdirSync(backupDirectory, { recursive:true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDirectory, `catalog.generated.${stamp}.json`);
  const payload = `${JSON.stringify({ schemaVersion:"1.0.0", generatedAt:report.runAt, sourceId:report.sourceId, products }, null, 2)}\n`;
  let backupCreated = false;
  try {
    fs.writeFileSync(temporary, payload, { encoding:"utf8", flag:"wx" });
    JSON.parse(fs.readFileSync(temporary, "utf8"));
    if (fs.existsSync(target)) { fs.copyFileSync(target, backupPath, fs.constants.COPYFILE_EXCL); backupCreated = true; fs.rmSync(target); }
    fs.renameSync(temporary, target);
    return { published:true, outputPath:target, backupPath:backupCreated ? backupPath : null };
  } catch (error) {
    if (fs.existsSync(temporary)) fs.rmSync(temporary);
    if (!fs.existsSync(target) && backupCreated && fs.existsSync(backupPath)) fs.copyFileSync(backupPath, target);
    throw error;
  }
}

module.exports = { publishAtomically };
