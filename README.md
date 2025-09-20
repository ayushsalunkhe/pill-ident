# MediScan - AI Medicine Analyzer

A smart medicine package analyzer that uses AI to extract medicine information from images and cross-references with FDA database or AI fallback.

## 🚀 Features

- **AI Image Analysis**: Uses Google Gemini AI to extract medicine information from package images
- **FDA Database Integration**: Searches official FDA database for US and international medicines
- **Smart Name Matching**: Handles brand names, generic names, and various medicine name formats
- **AI Fallback**: Uses OpenRouter API for medicines not found in FDA database (Indian medicines, etc.)
- **Beautiful UI**: Modern, responsive interface with real-time progress tracking

## 🧠 Smart Medicine Matching Strategy

### Problem Solved
FDA database requires exact medicine names, but extracted names might be:
- Brand names vs Generic names
- Different spellings/abbreviations  
- Indian/International medicines not in FDA
- Partial names from image text

### Solution: Multi-step Pipeline
1. **Extract with Gemini** → Get brand name, generic name, active ingredients
2. **Generate Search Variations** → Create multiple search terms
3. **FDA Search with Fallbacks** → Try different FDA endpoints and fields
4. **Fuzzy Matching** → Use similarity algorithms for close matches
5. **OpenRouter Fallback** → For non-FDA medicines

## 🛠️ Setup Instructions

### 1. Get API Keys

#### Google Gemini API (Free)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Replace `YOUR_GEMINI_API_KEY` in `script.js`

#### OpenRouter API (Free tier available)
1. Go to [OpenRouter.ai](https://openrouter.ai)
2. Sign up and get your API key
3. Replace `YOUR_OPENROUTER_API_KEY` in `script.js`

### 2. Run Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or use simple server
npm start
```

### 3. Open in Browser
Navigate to `http://localhost:3000`

## 🌐 Deployment

### Option 1: Cloudflare Pages (Recommended)
1. Upload files to Cloudflare Pages
2. Set up custom domain (optional)
3. No server required - runs entirely in browser

### Option 2: GitHub Pages
1. Push to GitHub repository
2. Enable GitHub Pages
3. Access via `username.github.io/repository-name`

### Option 3: Netlify
1. Drag and drop folder to Netlify
2. Automatic deployment
3. Custom domain support

## 📁 File Structure

```
mediscan-analyzer/
├── index.html          # Main HTML file
├── script.js           # JavaScript application logic
├── package.json        # Node.js dependencies
└── README.md          # This file
```

## 🔧 How It Works

### 1. Image Upload
- User uploads medicine package image
- Image is converted to base64 for API processing

### 2. Gemini Analysis
- Image sent to Google Gemini AI
- Extracts: brand name, generic name, dosage, manufacturer, form, purpose, active ingredients

### 3. FDA Search
- Generates multiple search variations from extracted names
- Searches FDA database using different endpoints:
  - `/label.json` - Drug labeling information
  - `/ndc.json` - National Drug Code database
  - `/drugsfda.json` - FDA drug database
- Uses multiple search fields for better matching

### 4. OpenRouter Fallback
- If not found in FDA database, uses OpenRouter API
- Analyzes image with Mistral AI model
- Provides detailed medicine information for non-FDA medicines

### 5. Results Display
- Shows comprehensive medicine information
- Indicates data source (FDA vs AI)
- Displays warnings and active ingredients

## 🎯 Supported Medicine Types

### FDA Database
- US FDA approved medicines
- International medicines in FDA database
- Prescription and over-the-counter drugs

### AI Fallback
- Indian medicines (not in FDA database)
- Regional medicines
- Generic medicines
- Herbal supplements

## 🔒 Privacy & Security

- **No Data Storage**: Images are not stored, only processed
- **API Keys**: Keep your API keys secure and don't share them
- **HTTPS**: Always use HTTPS in production
- **Rate Limiting**: Built-in API rate limiting

## 🐛 Troubleshooting

### Common Issues

1. **"Analysis Failed"**
   - Check API keys are correct
   - Verify image format (JPG, PNG, WebP)
   - Ensure stable internet connection

2. **"Not Found in FDA Database"**
   - Medicine might be Indian/regional
   - Try with clearer image
   - Check if medicine name is visible

3. **API Rate Limits**
   - Gemini: 15 requests per minute (free tier)
   - OpenRouter: Varies by model
   - Wait and retry

### Debug Mode
Open browser console (F12) to see detailed logs and API responses.

## 📊 API Usage

### Gemini API
- **Model**: gemini-1.5-flash
- **Free Tier**: 15 requests/minute
- **Cost**: Free for most use cases

### OpenRouter API
- **Model**: mistralai/mistral-small-3.2-24b-instruct:free
- **Free Tier**: Available
- **Cost**: Pay-per-use for higher limits

### FDA API
- **Rate Limit**: 1000 requests/hour
- **Cost**: Free
- **Coverage**: US and international medicines

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 🆘 Support

For issues or questions:
1. Check troubleshooting section
2. Review browser console for errors
3. Verify API keys and internet connection
4. Create GitHub issue with details

---

**Disclaimer**: This tool is for informational purposes only. Always consult healthcare professionals before making medical decisions.
