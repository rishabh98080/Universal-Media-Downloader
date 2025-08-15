// server.js
// DEFINITIVE VERSION - Rewritten to use yt-dlp-wrap and Puppeteer for best results.
// FINAL FIX: Prioritizes instant download start over pre-fetching file size.

// --- Import necessary libraries ---
const express = require('express');
const cors = require('cors');
const YTDlpWrap = require('yt-dlp-wrap').default;
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 8001; // Using port 8001 to avoid conflicts

// --- CRITICAL: yt-dlp setup and validation ---
const platform = os.platform();
const binaryName = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const ytDlpPath = path.join(__dirname, 'yt-dlp-bin', binaryName);

// Check if the binary exists before we even try to start the server
if (!fs.existsSync(ytDlpPath)) {
    console.error('❌ ERROR: yt-dlp binary not found!');
    console.error(`It seems the setup process hasn't been run or failed.`);
    console.error(`Please run "npm run setup" in your terminal to download the required tool.`);
    process.exit(1); // Exit the process with an error code
}

const ytDlpWrap = new YTDlpWrap(ytDlpPath);
// --- End of yt-dlp setup ---
const corsOptions = {
  origin: '*'
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// --- Helper function to format file size ---
const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// --- API Endpoints ---

// ✅ NO CHANGES HERE: This endpoint is for displaying info and is fine.
app.post('/api/video-info', async (req, res) => {
    const videoUrl = req.body.url;
    if (!videoUrl) {
        return res.status(400).json({ detail: 'Invalid or missing URL.' });
    }
    try {
        console.log(`Fetching info for: ${videoUrl} with yt-dlp`);
        const metadata = await ytDlpWrap.getVideoInfo(videoUrl);
        const { title, uploader, thumbnail, formats } = metadata;
        const processedFormats = formats.map(format => ({
            ...format,
            format_id: format.format_id,
            filesize_str: format.filesize ? formatBytes(format.filesize) : (format.filesize_approx ? `~${formatBytes(format.filesize_approx)}` : 'N/A')
        }));
        const responseData = { title, uploader, thumbnail, formats: processedFormats };
        res.json(responseData);
    } catch (err) {
        console.error('Error fetching video info with yt-dlp:', err.message);
        res.status(500).json({ detail: 'Failed to fetch video information. The URL might be invalid, or the video could be private or restricted.' });
    }
});


// 🔥 --- REVISED AND FINAL DOWNLOAD ENDPOINT --- 🔥
// In server.js

// 🔥 --- FINAL, ROBUST DOWNLOAD ENDPOINT --- 🔥
app.post('/api/download', (req, res) => {
    const { url: videoUrl, format_id: formatId, title, extension } = req.body;

    if (!videoUrl || !formatId || !title || !extension) {
        // This check is still important.
        return res.status(400).json({ detail: 'Missing URL, format ID, title, or extension.' });
    }

    try {
        // --- NEW, CORRECTED HEADER LOGIC ---

        // 1. Sanitize the title for file systems (still a good idea)
        const sanitizedTitle = title.replace(/[<>:"/\\|?*]+/g, '_').trim();

        // 2. Create a simple, ASCII-only fallback filename.
        //    This replaces any non-standard characters with an underscore.
        const asciiFilename = `${sanitizedTitle.replace(/[^\x00-\x7F]/g, "_")}.${extension}`;

        // 3. Create the full UTF-8 filename.
        const utf8Filename = `${sanitizedTitle}.${extension}`;
        
        console.log(`Preparing download for: ${utf8Filename}`);

        // 4. Set both headers. Modern browsers will prioritize 'filename*'.
        //    This is the standard way to handle special characters in downloads.
        res.setHeader('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(utf8Filename)}`);
        res.setHeader('Content-Type', 'application/octet-stream');

        // --- Stream logic remains the same ---
        const videoStream = ytDlpWrap.execStream([videoUrl, '-f', formatId]);

        videoStream.pipe(res);

        videoStream.on('error', (streamErr) => {
            console.error('Error during video stream:', streamErr.message);
            res.end();
        });

    } catch (err) {
        console.error('Error initiating download stream:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ detail: 'Failed to start download stream.' });
        }
    }
});


// ✅ NO CHANGES HERE: Scraper behavior is correct.
app.post('/api/scrape-page', async (req, res) => {
    const pageUrl = req.body.url;
    if (!pageUrl) {
        return res.status(400).json({ detail: 'Missing URL.' });
    }
    let browser = null;
    try {
        console.log(`Scraping page with Puppeteer: ${pageUrl}`);
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        const mediaFiles = await page.evaluate(() => {
            const media = new Set();
            const baseUrl = window.location.origin;
            const mediaExtensions = [
                '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico',
                '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv',
                '.mp3', '.wav', '.ogg', '.m4a',
                '.mp4', '.webm', '.mov', '.avi', '.mkv',
                '.zip', '.rar', '.7z', '.tar', '.gz'
            ];
            const resolveUrl = (url) => new URL(url, baseUrl).href;
            document.querySelectorAll('a, img, audio, video, source').forEach(el => {
                const src = el.href || el.src;
                if (src) {
                    const hasMediaExtension = mediaExtensions.some(ext => src.toLowerCase().includes(ext));
                    if (hasMediaExtension) {
                        try {
                            const absoluteSrc = resolveUrl(src);
                            const filename = absoluteSrc.split('/').pop().split('?')[0];
                            const fileType = filename.split('.').pop();
                            if (filename && fileType) {
                                media.add(JSON.stringify({ name: filename, type: fileType, src: absoluteSrc }));
                            }
                        } catch (e) { /* Ignore invalid URLs */ }
                    }
                }
            });
            return Array.from(media).map(item => JSON.parse(item));
        });
        res.json({ media: mediaFiles });
    } catch (err) {
        console.error('Error scraping page with Puppeteer:', err.message);
        res.status(500).json({ detail: 'Failed to scrape the page. It might be protected or timed out.' });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

// --- Start the server ---
app.listen(PORT, () => {
    console.log(`🎉 Definitive Server is running on http://localhost:${PORT}`);
    console.log('Now using manually downloaded & permissioned yt-dlp. Waiting for requests...');
});