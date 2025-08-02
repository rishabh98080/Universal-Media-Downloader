import React, { useState, useEffect } from 'react';
import './App.css';
import qrcodeImage from './qrcode.jpg'; // Make sure you have this image in your src folder

// This will be set by your .env file
const BACKEND_URL = 'http://localhost:8001';

// --- DEBUGGING LINE ---
// Let's see what URL the app is actually using.
console.log("Attempting to use backend URL:", BACKEND_URL);


// A reusable component to display the list of video formats
const FormatList = ({ videoInfo, originalUrl, onDownload, downloadingFormatId }) => (
  <div className="video-preview-list">
    <div className="video-header">
      <img src={videoInfo.thumbnail} alt={videoInfo.title} className="video-header-thumbnail" />
      <div className="video-header-details">
        <h3>{videoInfo.title}</h3>
        <p>by {videoInfo.uploader}</p>
      </div>
    </div>
    <h4>Available Formats:</h4>
    <ul className="format-list">
      {videoInfo.formats
        .filter(f => f.url && (f.vcodec !== 'none' || f.acodec !== 'none'))
        .sort((a, b) => (b.height || 0) - (a.height || 0))
        .map((format) => (
        <li className="format-item" key={format.format_id}>
          <span className="format-note">{format.format_note || format.resolution}</span>
          <span className="format-ext">{format.ext}</span>
          <span className="format-size">{format.filesize_str || 'N/A'}</span>
          <button
            onClick={() => onDownload(originalUrl, format.format_id)}
            disabled={downloadingFormatId === format.format_id}
            className="download-btn-small"
          >
            {downloadingFormatId === format.format_id ? 'Downloading...' : '⬇️ Download'}
          </button>
        </li>
      ))}
    </ul>
  </div>
);

// Placeholder components for new pages
const AboutUs = () => (
    <div className="section" style={{textAlign: 'left', lineHeight: '1.8'}}>
        <h2>About Universal Media Downloader</h2>
        <p>Welcome to the Universal Media Downloader, a tool designed with a singular objective: to provide a free, intuitive, and reliable solution for downloading media from across the internet. Whether you are saving a video from a popular platform or archiving files from a webpage, our service is engineered to make the process seamless and efficient.</p>
        <h4>A Note from the Developer</h4>
        <p>This project is a passion-driven, solo endeavor developed and maintained by a single student. It represents countless hours of dedication to creating a tool that is both powerful and accessible. The continued operation and enhancement of this service, however, involve real-world costs, including server maintenance, API access, and domain registration.</p>
    </div>
);

const PrivacyPolicy = () => (
    <div className="section" style={{textAlign: 'left', lineHeight: '1.8'}}>
        <h2>Privacy Policy</h2>
        <p><strong>Last Updated: July 31, 2025</strong></p>
        <p>We do not require you to provide us with any personally identifiable information. The only data we process is the URL you provide for the purpose of fetching downloadable media. These URLs are not stored or logged. They are processed in real-time and discarded after the request is complete.</p>
    </div>
);

const HowToUseIt = () => (
    <div className="section" style={{textAlign: 'left', lineHeight: '1.8'}}>
        <h2>How to Use the Universal Media Downloader</h2>
        <p>This guide provides a step-by-step walkthrough of its two primary features: downloading specific videos and scraping webpages for all media files.</p>
        <h4>Feature 1: Download a Specific Video (from YouTube, Instagram, etc.)</h4>
        <ol>
            <li>Navigate to the Home Page.</li>
            <li>Copy the video URL from your browser's address bar.</li>
            <li>Paste the URL into the input field that says, "Enter YouTube or Instagram video URL."</li>
            <li>Click the "Fetch Formats" button.</li>
            <li>A list will appear displaying different resolutions and file sizes. Click the "Download" button next to the version you wish to save.</li>
        </ol>
        <h4>Feature 2: Scrape a Webpage for All Media Files</h4>
        <ol>
            <li>Navigate to the Home Page.</li>
            <li>Copy the webpage URL from your browser's address bar.</li>
            <li>Paste the URL into the input field that says, "Enter website URL to find files."</li>
            <li>Click the "Find Files" button.</li>
            <li>A list of all found media will be displayed. Click the "Download" button next to any file you wish to save.</li>
        </ol>
    </div>
);

const PaypalPage = () => (
    <div className="section">
        <h2>Donate via PayPal</h2>
        <p style={{marginTop: '1.5rem'}}>Use the PayPal ID below or the email address:</p>
        <h3><b><i>@RishabhKumar484874<br/><br/>rishabh24273239pandey@gmail.com</i></b></h3>
    </div>
);

const UpiPage = () => (
    <div className="section">
        <h2>Donate via UPI</h2>
        <p>Scan this QR code using any UPI app (Google Pay, PhonePe, Paytm, etc.).</p>
        <img src={qrcodeImage} alt="UPI QR Code" className="qr-code-image" />
        <p style={{marginTop: '1.5rem'}}>Or use the UPI ID:</p>
        <p style={{fontSize: '1.2em', fontWeight: 'bold', color: '#333'}}>9508067578@axl</p>
    </div>
);


function App() {
  const [activePage, setActivePage] = useState('home');
  const [url, setUrl] = useState('');
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [downloadingFormatId, setDownloadingFormatId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // --- NEW: Check if the backend URL is set ---
    if (!BACKEND_URL) {
      setError("Configuration Error: The backend URL is not set. Please check your .env file and restart the server.");
    }

    const titles = {
      home: 'Universal Media Downloader | Free Video & File Scraper',
      about: 'About Us | Universal Media Downloader',
      privacy: 'Privacy Policy | Universal Media Downloader',
      'how-to': 'How to Use | Universal Media Downloader',
      paypal: 'Donate via PayPal | Support Universal Media Downloader',
      upi: 'Donate via UPI | Support Universal Media Downloader',
    };
    document.title = titles[activePage] || titles.home;
  }, [activePage]);

  const fetchVideoInfo = async () => {
    if (!videoUrl.trim() || !BACKEND_URL) return;
    setVideoLoading(true);
    setError('');
    setSuccess('');
    setVideoInfo(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/video-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to get video info');
      }
      const data = await res.json();
      setVideoInfo(data);
    } catch (err) {
      setError(err.message);
    }
    setVideoLoading(false);
  };
  
  const handleFormatDownload = async (urlToDownload, formatId) => {
    if (!BACKEND_URL) return;
    setDownloadingFormatId(formatId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToDownload, format_id: formatId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to download video');
      }
      
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = 'video.mp4';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+?)"/);
        if (match) filename = match[1];
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      setSuccess(`Download started!`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    }
    setDownloadingFormatId(null);
  };

  const fetchMedia = async (e) => {
    e.preventDefault();
    if (!BACKEND_URL) return;
    setLoading(true);
    setError('');
    setMedia([]);
    try {
      const res = await fetch(`${BACKEND_URL}/api/scrape-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to fetch media');
      }
      const data = await res.json();
      setMedia(data.media);
      if (data.media.length === 0) setError('No downloadable media found on this page.');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'about': return <AboutUs />;
      case 'privacy': return <PrivacyPolicy />;
      case 'how-to': return <HowToUseIt />;
      case 'paypal': return <PaypalPage />;
      case 'upi': return <UpiPage />;
      case 'home':
      default:
        return (
          <>
            <h1>Universal Media Downloader</h1>
            <div className="section">
              <h2>Download Video (YouTube, Instagram, etc.)</h2>
              <form onSubmit={(e) => { e.preventDefault(); fetchVideoInfo(); }} className="video-input-container">
                <input type="url" placeholder="Enter video URL" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className="video-url-input" required />
                <button type="submit" className="preview-btn" disabled={videoLoading || !videoUrl.trim()}>
                  {videoLoading ? '⏳ Fetching...' : '📊 Fetch Formats'}
                </button>
              </form>
              {videoInfo && <FormatList videoInfo={videoInfo} originalUrl={videoUrl} onDownload={handleFormatDownload} downloadingFormatId={downloadingFormatId} />}
            </div>
            
            <div className="section">
              <h2>Scrape Page for Files</h2>
              <form onSubmit={fetchMedia} className="url-form">
                <input type="url" placeholder="Enter website URL to find files (images, PDFs, etc.)" value={url} onChange={e => setUrl(e.target.value)} required />
                <button type="submit" disabled={loading}>Find Files</button>
              </form>
            </div>

            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}
            {loading && <div className="loading">🔍 Searching for media...</div>}
            <div className="media-list">
              {media.map((item, idx) => {
                const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(item.type.toLowerCase());
                return (
                  <div className="media-item" key={idx}>
                    <div className="media-thumbnail-container">
                      {isImage ? (
                        <img src={item.src} alt={item.name} className="media-thumbnail" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                      ) : (
                        <div className="media-icon-placeholder">
                          <span className="file-icon">📄</span>
                          <span className="file-type-label">{item.type}</span>
                        </div>
                      )}
                    </div>
                    <div className="media-item-info">
                      <strong title={item.name}>{item.name}</strong>
                    </div>
                    <a href={item.src} className="media-item-download-btn" target="_blank" rel="noopener noreferrer" download>Download</a>
                  </div>
                );
              })}
            </div>
            <div id="donate-section" className="donate-section">
                <h2>Support Our Work!</h2>
                <p>If you find this tool useful, consider making a small donation to help us keep it running.</p>
                <div className="donate-buttons-container">
                    <button className="donate-button paypal-button" onClick={() => setActivePage('paypal')}>Donate via PayPal</button>
                    <button className="donate-button upi-button" onClick={() => setActivePage('upi')}>Donate via UPI (India)</button>
                </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-left">
            <button className="header-donate-button" onClick={() => { setActivePage('home'); setTimeout(() => document.getElementById('donate-section')?.scrollIntoView({ behavior: 'smooth' }), 0); }}>Donate</button>
        </div>
        <nav className="app-nav">
          <a onClick={() => setActivePage('home')} className={activePage === 'home' ? 'active' : ''}>Home</a>
          <a onClick={() => setActivePage('about')} className={activePage === 'about' ? 'active' : ''}>About Us</a>
          <a onClick={() => setActivePage('privacy')} className={activePage === 'privacy' ? 'active' : ''}>Privacy Policy</a>
          <a onClick={() => setActivePage('how-to')} className={activePage === 'how-to' ? 'active' : ''}>How to use it</a>
        </nav>
      </header>
      <main className="app-main">{renderPage()}</main>
      <footer className="app-footer">
        <p>&copy; 2025 Universal Media Downloader. All Rights Reserved.</p>
        <p className="disclaimer">Disclaimer: This tool is for personal use only. Users are responsible for ensuring they have the right to download and use any content accessed through this service.</p>
      </footer>
    </div>
  );
}

export default App;
