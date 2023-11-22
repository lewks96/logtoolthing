"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const csv = __importStar(require("csv-writer"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
var ScriptType;
(function (ScriptType) {
    ScriptType["AM"] = "AM";
    ScriptType["IDM"] = "IDM";
})(ScriptType || (ScriptType = {}));
function parseConfigurationFile(filePath) {
    const source = fs.readFileSync(filePath, 'utf8');
    const configurationFile = JSON.parse(source);
    return configurationFile;
}
function main() {
    console.log(chalk_1.default.blue('Log Audit Tool'));
    console.log(chalk_1.default.blue('----------------'));
    if (process.argv.length < 3) {
        console.log(chalk_1.default.red('Usage: node index.js <files.json>'));
        process.exit(1);
    }
    const files = parseConfigurationFile(process.argv[2]);
    //const files = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
    const filesToParse = files.files.length;
    console.log(chalk_1.default.blue(`Parsing ${filesToParse} files...`));
    // get full directory of process.argv[2]
    const baseDir = path.resolve(path.dirname(process.argv[2]));
    console.log(chalk_1.default.blue(`Directory: ${baseDir}`));
    const dateTime = new Date();
    const outputDir = baseDir + '/output ' + dateTime.toUTCString().split(',')[1].replaceAll(':', '.');
    fs.mkdirSync(outputDir);
    const processorAm = new AMLogProcessor();
    files.files.forEach((file) => {
        const absolutePath = baseDir + '/' + file.filename;
        console.log(chalk_1.default.blue(file.filename));
        switch (file.scriptType) {
            case ScriptType.AM:
                processorAm.processFile(absolutePath, file, outputDir + '/' + file.friendlyName + '.csv');
                break;
            case ScriptType.IDM:
            default:
                console.log(chalk_1.default.red('IDM not supported yet'));
                break;
        }
    });
}
// AM ILogProcessor
class AMLogProcessor {
    parseDateTimeString(dateTimeString) {
        const date = dateTimeString.split(' ')[0];
        const time = dateTimeString.split(' ')[1];
        const year = date.split('/')[2];
        const month = date.split('/')[0];
        const day = date.split('/')[1];
        const hour = time.split(':')[0];
        const minute = time.split(':')[1];
        const second = time.split(':')[2].split('.')[0];
        const millisecond = time.split(':')[3].split('.')[0];
        const timestamp = year + '-' + month + '-' + day + 'T' + hour + ':' + minute + ':' + second + '.' + millisecond + 'Z';
        return Date.parse(timestamp);
    }
    processFile(filepath, fileDescription, output) {
        console.log(chalk_1.default.green('Processing file: ' + filepath));
        const filename = fileDescription.filename;
        const nickname = fileDescription.friendlyName;
        const keywords = fileDescription.keywords;
        const start = fileDescription.startString;
        const headers = [];
        for (var i = 0; i < keywords.length; i++) {
            headers.push({ id: keywords[i].searchString, title: keywords[i].searchString });
            headers.push({ id: keywords[i].searchString + '-epoch', title: keywords[i].searchString + '-epoch' });
        }
        const csvWriter = csv.createObjectCsvWriter({
            path: output,
            header: headers
        });
        console.log(chalk_1.default.green(`Processing ${filepath}...`));
        console.log(chalk_1.default.green(`CSV File: ${output}...`));
        console.log(chalk_1.default.green(`Keywords: ${keywords.length}`));
        const lineArray = fs.readFileSync(filepath, 'utf-8').split('\n');
        var lineWithTimestamp = '';
        var lineWithTimestamp = "";
        var record = new Map();
        const records = [];
        var started = false;
        for (var i = 0; i < lineArray.length; i++) {
            const line = lineArray[i];
            if (line.includes(start)) {
                if (started) {
                    records.push(record);
                    record.set('filename', nickname);
                    started = false;
                }
                started = true;
                continue;
            }
            if (line.includes(filename)) {
                lineWithTimestamp = line;
                continue;
            }
            for (var j = 0; j < keywords.length; j++) {
                if (line.includes(keywords[j].searchString)) {
                    var ts = lineWithTimestamp.replace(filename + ':', '').trim();
                    ts = ts.substring(0, ts.indexOf('UTC'));
                    record.set(keywords[j].searchString, ts);
                    record.set(keywords[j].searchString + '-epoch', this.parseDateTimeString(ts).toString());
                }
            }
            records.push(Object.fromEntries(record));
        }
        csvWriter.writeRecords(records)
            .then(() => {
            console.log(chalk_1.default.green(`Done processing ${filepath}...`));
        });
    }
}
main();
