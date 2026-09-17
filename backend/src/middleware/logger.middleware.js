const fs = require("fs");
const path = require("path");
const morgan = require("morgan");

const logDirectory = path.join(process.cwd(), "logs");

if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

const accessLogStream = fs.createWriteStream(
    path.join(logDirectory, "access.log"),
    { flags: "a" }
);

module.exports = morgan("combined", {
    stream: accessLogStream
});