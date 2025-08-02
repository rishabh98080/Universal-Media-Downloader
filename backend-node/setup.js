// setup.js
// This script's only job is to download the yt-dlp binary.
// Run this file ONCE after `npm install`.

const YTDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');
const fs = require('fs');

async function downloadYtDlp() {
    console.log('Starting the download for the yt-dlp binary...');
    
    // Define the directory where the binary should be saved
    const binDir = path.join(__dirname, 'yt-dlp-bin');

    // Create the directory if it doesn't exist
    if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir, { recursive: true });
    }
    
    try {
        // This function downloads the binary to the specified path
        await YTDlpWrap.downloadFromGithub(path.join(binDir, 'yt-dlp'));
        console.log('✅ yt-dlp binary downloaded successfully!');
        console.log('You are all set. You can now run "npm run dev" to start the server.');
    } catch (error) {
        console.error('❌ Failed to download yt-dlp binary:', error);
    }
}

downloadYtDlp();
