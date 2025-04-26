const { spawn } = require('child_process');
const path = require('path');

class TextIndexer {
    constructor(baseDir) {
        this.baseDir = baseDir;
        this.pythonScript = path.join(process.cwd(), 'text_indexer.py');
    }

    async scan_files() {
        return new Promise((resolve, reject) => {
            const python = spawn('python3', [
                this.pythonScript,
                '--action', 'scan',
                '--base-dir', this.baseDir
            ]);

            let output = '';
            let error = '';

            python.stdout.on('data', (data) => {
                output += data.toString();
            });

            python.stderr.on('data', (data) => {
                error += data.toString();
            });

            python.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Python process exited with code ${code}: ${error}`));
                } else {
                    try {
                        resolve(JSON.parse(output));
                    } catch (e) {
                        reject(new Error(`Failed to parse Python output: ${e.message}`));
                    }
                }
            });
        });
    }

    async search(query, maxResults = 10, fuzzyMatch = true, minSimilarity = 0.8) {
        return new Promise((resolve, reject) => {
            const python = spawn('python3', [
                this.pythonScript,
                '--action', 'search',
                '--base-dir', this.baseDir,
                '--query', query,
                '--max-results', maxResults.toString(),
                '--fuzzy-match', fuzzyMatch.toString(),
                '--min-similarity', minSimilarity.toString()
            ]);

            let output = '';
            let error = '';

            python.stdout.on('data', (data) => {
                output += data.toString();
            });

            python.stderr.on('data', (data) => {
                error += data.toString();
            });

            python.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Python process exited with code ${code}: ${error}`));
                } else {
                    try {
                        resolve(JSON.parse(output));
                    } catch (e) {
                        reject(new Error(`Failed to parse Python output: ${e.message}`));
                    }
                }
            });
        });
    }
}

module.exports = { TextIndexer };
