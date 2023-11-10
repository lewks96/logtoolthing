/*
 *  Log Audit Tool
*/

import fs, { stat } from 'fs';
import path from 'path';
import process from 'process';
import chalk from 'chalk';
import csv from 'csv-writer';

console.log(chalk.blue('Log Audit Tool'));
console.log(chalk.blue('----------------'));
if (process.argv.length < 3) {
    console.log(chalk.red('Usage: node index.js <files.json>'));
    process.exit(1);
}

var timestamp = false;
if (process.argv.length > 3) {
    if (process.argv[3] == '-timestamp') {
        console.log(chalk.blue('Timestamps will be parsed...'));
        timestamp = true;
    }
}

const files = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const filesToParse = files.files.length;
console.log(chalk.blue(`Parsing ${filesToParse} files...`));

// get full directory of process.argv[2]
const baseDir = path.resolve(path.dirname(process.argv[2]));
console.log(chalk.blue(`Directory: ${baseDir}`));

const dateTime = new Date();
const outputDir = baseDir + '/output ' + dateTime.toUTCString().split(',')[1].replaceAll(':', '.');
fs.mkdirSync(outputDir);

files.files.forEach((file) => {
    const absolutePath = baseDir + '/' + file.filename;
    console.log(chalk.blue(file.filename));
    processFile(absolutePath, file, outputDir + '/' + file.nickname + '.csv');
});

function parseTimestamp(string) {
    const date = string.split(' ')[0];
    const time = string.split(' ')[1];

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

function processFile(scriptFile, file, outputCsvFile) {
    const filename = file.filename;
    const nickname = file.nickname;
    const keywords = file.keywords;
    const start = file.start;

    const headers = [];
    headers.push({ id: 'filename', title: 'Filename' });
    for (var i = 0; i < keywords.length; i++) {
        headers.push({ id: keywords[i].tag, title: keywords[i].tag });
        if (timestamp) {
            headers.push({ id: keywords[i].tag + '-epoch', title: keywords[i].tag + '-epoch' });
        }
    }

    const csvWriter = csv.createObjectCsvWriter({
        path: outputCsvFile,
        header: headers
    });

    console.log(chalk.green(`Processing ${scriptFile}...`));
    console.log(chalk.green(`CSV File: ${outputCsvFile}...`));
    console.log(chalk.green(`Keywords: ${keywords.length}`));

    // read scriptFile to line array of strings
    const lineArray = fs.readFileSync(scriptFile, 'utf8').split('\n');

    var lineWithTimestamp = "";
    var record = {
        filename: nickname
    };
    const records = [];

    var started = false;
    for (var i = 0; i < lineArray.length; i++) {
        const line = lineArray[i];

        if (line.includes(start)) {
            //console.log(chalk.bgGray(`Found ${start} in ${filename}`));
            if (started) {
                records.push(record);
                record = {
                    filename: nickname
                };
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
            if (line.includes(keywords[j].string)) {
                var ts = lineWithTimestamp.replace(filename + ':', '').trim();
                ts = ts.substring(0, ts.indexOf('UTC'));
                if (timestamp) {
                    record[keywords[j].tag + '-epoch'] = parseTimestamp(ts);
                }
                record[keywords[j].tag] = ts;
            }
        }
    }
    records.push(record);

    csvWriter.writeRecords(records)
        .then(() => {
            console.log(chalk.green(`Done processing ${scriptFile}...`));
        });

}