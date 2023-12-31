import chalk from 'chalk';
import * as csv from 'csv-writer';
import * as fs from 'fs';
import * as path from 'path';

type Keyword = {
    searchString: string;
    symbol: string;
};

enum ScriptType {
    AM = 'AM',
    AM2 = 'AM2',
    IDM = 'IDM'
}

type FileDescription = {
    filename: string;
    friendlyName: string;
    scriptType: ScriptType;
    startString: string;
    keywords: Keyword[];
};

type ConfigurationFile = {
    files: FileDescription[];
};

interface ILogProcessor {
    processFile(filepath: string, fileDescription: FileDescription, output: string): void;
}

function parseConfigurationFile(filePath: string): ConfigurationFile {
    const source = fs.readFileSync(filePath, 'utf8');
    const configurationFile = JSON.parse(source);
    return configurationFile;
}

function main() {
    console.log(chalk.blue('Log Audit Tool'));
    console.log(chalk.blue('----------------'));
    if (process.argv.length < 3) {
        console.log(chalk.red('Usage: node index.js <files.json>'));
        process.exit(1);
    }
   
    const files = parseConfigurationFile(process.argv[2]);
    //const files = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
    const filesToParse = files.files.length;
    console.log(chalk.blue(`Parsing ${filesToParse} files...`));
    
    // get full directory of process.argv[2]
    const baseDir = path.resolve(path.dirname(process.argv[2]));
    console.log(chalk.blue(`Directory: ${baseDir}`));
    
    const dateTime = new Date();
    const outputDir = baseDir + '/output ' + dateTime.toUTCString().split(',')[1].replaceAll(':', '.');
    fs.mkdirSync(outputDir);
   
    const processorAmLegacy = new LegacyAMLogProcessor();
    const processorAm = new AMLogProcessor();

    files.files.forEach((file) => {
        const absolutePath = baseDir + '/' + file.filename;
        switch (file.scriptType) {
            case ScriptType.AM:
                processorAmLegacy.processFile(absolutePath, file, outputDir + '/' + file.friendlyName + '.csv');
                break;
            case ScriptType.AM2:
                processorAm.processFile(absolutePath, file, outputDir + '/' + file.friendlyName + '.csv');
                break;
            case ScriptType.IDM:
            default:
                console.log(chalk.red('IDM not supported yet'));
                break;
        }
    });
}


// Legacy AM ILogProcessor
class LegacyAMLogProcessor implements ILogProcessor {

    parseDateTimeString(dateTimeString: string): Number {
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

    processFile(filepath: string, fileDescription: FileDescription, output: string): void {
        console.log(chalk.green('Processing file: ' + filepath));

        const filename = fileDescription.filename;
        const nickname = fileDescription.friendlyName;
        const keywords = fileDescription.keywords;
        const start = fileDescription.startString;

        const headers : any[] = [];
        for (var i = 0; i < keywords.length; i++) {
            headers.push({ id: keywords[i].searchString, title: keywords[i].searchString });
            headers.push({ id: keywords[i].searchString + '-epoch', title: keywords[i].searchString + '-epoch' });
        }

        const csvWriter = csv.createObjectCsvWriter({
            path: output,
            header: headers
        });
        console.log(chalk.green(`Processing ${filepath}...`));
        console.log(chalk.green(`CSV File: ${output}...`));
        console.log(chalk.green(`Keywords: ${keywords.length}`));

        const lineArray = fs.readFileSync(filepath, 'utf-8').split('\n'); 
        var lineWithTimestamp = '';
        var lineWithTimestamp = "";


        var record: Map<string, string> = new Map<string, string>();

        const records: Array<any> = [];

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
            console.log(chalk.green(`Done processing ${filepath}...`));
        });
    }
}

// New AM ILogProcessor - Tracks transactions sequentially
class AMLogProcessor implements ILogProcessor {

    parseDateTimeString(dateTimeString: string): Number {
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

    sortRecordsByTransactionId(lnes: Array<string>): Map<string, Array<string>> {
        console.log(chalk.green('Sorting records by TransactionId...'));
        const records: Map<string, Array<string>> = new Map<string, Array<string>>();
        var currentTransactionId = '';
        for (var i = 0; i < lnes.length; i++) {
            const line = lnes[i];
            if (line.includes('TransactionId')) {
                currentTransactionId = line.split(' ')[5];
                currentTransactionId = currentTransactionId.replace('TransactionId[', '').replace(']', '');
                console.log(chalk.cyan('\tTransactionId: ' + currentTransactionId));
                const transaction = records.get(currentTransactionId);
                i++;
                const nextLine = lnes[i];

                if (transaction == null) {
                    const t= new Array<string>();
                    t.push(line);
                    t.push(nextLine);
                    records.set(currentTransactionId, t);
                } else {
                    transaction.push(line);
                    transaction.push(nextLine);
                    records.set(currentTransactionId, transaction);
                }
            }
        }
        return records;
    }

    processFile(filepath: string, fileDescription: FileDescription, output: string): void {
        console.log(chalk.green('AM2 Processing file: ' + filepath));

        const filename = fileDescription.filename;
        const nickname = fileDescription.friendlyName;
        const keywords = fileDescription.keywords;
        const start = fileDescription.startString;

        const headers : any[] = [];
        for (var i = 0; i < keywords.length; i++) {
            headers.push({ id: keywords[i].searchString, title: keywords[i].searchString });
            headers.push({ id: keywords[i].searchString + '-epoch', title: keywords[i].searchString + '-epoch' });
        }


        const csvWriter = csv.createObjectCsvWriter({
            path: output,
            header: headers
        });
        console.log(chalk.green(`CSV File: ${output}...`));
        console.log(chalk.green(`Keywords: ${keywords.length}`));

        const source = fs.readFileSync(filepath, 'utf-8').split('\n'); 
        const sortedRecords = this.sortRecordsByTransactionId(source);

        var lineWithTimestamp = '';

        var record: Map<string, string> = new Map<string, string>();

        const lineArray = new Array<string>();
        sortedRecords.forEach((value, _) => {
            lineArray.push(...value);
        });

        const records: Array<any> = [];
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
            console.log(chalk.green(`Done processing ${filepath}...`));
        });
    }
}

main();
