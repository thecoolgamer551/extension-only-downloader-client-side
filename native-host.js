const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const os = require('os');

// Native Messaging I/O
let inputBuffer = Buffer.alloc(0);

process.stdin.on('data', (chunk) => {
    inputBuffer = Buffer.concat([inputBuffer, chunk]);
    
    while (inputBuffer.length >= 4) {
        const msgLen = inputBuffer.readUInt32LE(0);
        if (inputBuffer.length >= 4 + msgLen) {
            const msgStr = inputBuffer.toString('utf8', 4, 4 + msgLen);
            inputBuffer = inputBuffer.subarray(4 + msgLen);
            handleMessage(JSON.parse(msgStr));
        } else {
            break;
        }
    }
});

function sendMessage(msgObj) {
    const msgStr = JSON.stringify(msgObj);
    const msgBuffer = Buffer.from(msgStr, 'utf8');
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(msgBuffer.length, 0);
    process.stdout.write(lengthBuffer);
    process.stdout.write(msgBuffer);
}

const rootDir = __dirname;
function getLocalBinaryPath(name) {
    const local = path.join(rootDir, name);
    if (fs.existsSync(local)) return local;
    const inBin = path.join(rootDir, 'bin', name);
    if (fs.existsSync(inBin)) return inBin;
    const inSysBin = path.join(rootDir, '..', 'backend', 'bin', name);
    if (fs.existsSync(inSysBin)) return inSysBin;
    const inBackend = path.join(rootDir, '..', 'backend', name);
    if (fs.existsSync(inBackend)) return inBackend;
    return name;
}

let activeServer = null;
let tempFilePath = null;

function handleMessage(msg) {
    if (msg.action === 'start') {
        const { url, quality, format } = msg;

        const ytdlpPath = getLocalBinaryPath('yt-dlp.exe');
        const ffmpegPath = getLocalBinaryPath('ffmpeg.exe');
        
        // Use an OS temporary directory
        const tempFilename = `ytdl_temp_${Date.now()}`;
        tempFilePath = path.join(os.tmpdir(), tempFilename + '.' + format);
        const outputTemplate = tempFilePath;

        // First, get the video title to use as the final filename
        const titleCmd = `"${ytdlpPath}" --print filename -o "%(title)s.%(ext)s" --restrict-filenames "${url}"`;
        const titleProc = spawn(titleCmd, { shell: true });
        
        let fileTitle = "Downloaded_Video." + format;
        titleProc.stdout.on('data', (d) => {
             const t = d.toString().trim();
             if (t) fileTitle = t;
        });

        titleProc.on('close', () => {
             // Now start the actual download
             let formatString = '';
             if (format === 'mp3') {
                 formatString = 'bestaudio/best';
             } else {
                 let resTarget = '';
                 if (quality === '1080p') resTarget = '[height<=1080]';
                 else if (quality === '720p') resTarget = '[height<=720]';
                 else if (quality === '480p') resTarget = '[height<=480]';
                 else if (quality === '360p') resTarget = '[height<=360]';
                 
                 if (format === 'webm') {
                     formatString = `bestvideo${resTarget}[ext=webm]+bestaudio[ext=webm]/best${resTarget}[ext=webm]`;
                 } else {
                     formatString = `bestvideo${resTarget}+bestaudio/best${resTarget}`;
                 }
             }

             let args = [
                 '-o', `"${outputTemplate}"`,
                 '-f', `"${formatString}"`,
                 '--newline',
                 '--no-playlist',
                 '--no-part'
             ];

             if (fs.existsSync(ffmpegPath)) {
                 args.push('--ffmpeg-location', `"${ffmpegPath}"`);
             }
             args.push('--prefer-ffmpeg');

             if (format === 'mp3') {
                 args.push('--extract-audio', '--audio-format', 'mp3');
             } else {
                 args.push('--merge-output-format', format);
             }

             args.push(`"${url}"`);

             const fullCmd = `"${ytdlpPath}" ${args.join(' ')}`;
             const ytdlp = spawn(fullCmd, { shell: true, windowsHide: true });

             ytdlp.stdout.on('data', (d) => {
                 const line = d.toString().trim();
                 const match = line.match(/\[download\]\s+([\d.]+)%/);
                 if (match) {
                     sendMessage({ type: 'progress', percent: parseFloat(match[1]) });
                 }
             });

             ytdlp.on('error', (err) => {
                 sendMessage({ type: 'error', error: err.message });
             });

             ytdlp.on('close', (code) => {
                 if (code === 0 && fs.existsSync(tempFilePath)) {
                     // Start ephemeral HTTP server to transfer file to browser
                     activeServer = http.createServer((req, res) => {
                         const stat = fs.statSync(tempFilePath);
                         res.writeHead(200, {
                             'Content-Type': 'application/octet-stream',
                             'Content-Length': stat.size,
                             'Content-Disposition': `attachment; filename="${encodeURIComponent(fileTitle)}"`
                         });
                         const readStream = fs.createReadStream(tempFilePath);
                         readStream.pipe(res);
                     });
                     
                     activeServer.listen(0, '127.0.0.1', () => {
                         const port = activeServer.address().port;
                         sendMessage({ 
                             type: 'ready', 
                             url: `http://127.0.0.1:${port}/video`, 
                             filename: fileTitle,
                             tempFilePath: tempFilePath
                         });
                     });
                 } else {
                     sendMessage({ type: 'error', error: 'Download failed or file not found.' });
                 }
             });
        });
    } else if (msg.action === 'cleanup') {
        if (activeServer) activeServer.close();
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try { fs.unlinkSync(tempFilePath); } catch (e) {}
        }
        process.exit(0);
    }
}
