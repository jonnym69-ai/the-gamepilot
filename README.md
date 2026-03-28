# GamePilot - Your Personal Gaming Library Manager

**Version 1.1.0** | **Copyright © 2026 Moz** | **Proprietary Software**

GamePilot is a comprehensive desktop application for managing your gaming library, analyzing system performance, and getting smart game recommendations based on your mood, available time, and hardware capabilities.

## Features

### 📚 Library Management
- Scan and import games from Steam, Epic Games, GOG, Origin, Ubisoft Connect, Battle.net, Rockstar Games, Xbox Game Pass, and PlayStation
- Track playtime, completion status, and personal ratings
- Organize games by mood, genre, and platform
- Export library data in multiple formats

### 🎮 Game Compatibility Analysis
- 770+ game database with detailed system requirements
- Real-time compatibility checking against your hardware
- Detailed system requirements breakdown in Game Modal
- Performance level indicators (Ultra, High, Low, Ultra Low)
- Estimated FPS calculations

### ⚡ Performance Cockpit
- Comprehensive system hardware analysis
- Bottleneck detection and identification
- Upgrade recommendations with cost estimates
- Game compatibility matrix
- Overall system performance score

### 🎯 Smart Recommendations (Perfect Play)
- Get game recommendations based on mood and genre
- Filter by available playtime
- Intelligent matching algorithm
- Quick access to best matches

### 💰 Library Valuation
- Calculate total library value
- Multi-currency support (USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, BRL, RUB)
- Real-time price conversion
- Game pricing from Steam API

### 🎨 Customization
- Multiple theme options (Digital Ocean, Cyberpunk, Retro, etc.)
- Dark/Light mode support
- Customizable currency selection
- Flexible UI layouts

## Installation

### Windows
1. Download `GamePilot Setup 1.1.0.exe` from the releases page
2. Run the installer
3. Follow the installation wizard
4. Launch GamePilot from your Start Menu

### Development Setup
```bash
npm install
npm start
```

### Building
```bash
npm run build
npm run build-electron-win
```

## Usage

### Scanning Your Library
1. Open GamePilot
2. Click "Scan Library" to detect games from all installed platforms
3. Wait for the scan to complete
4. Your library will be automatically saved

### Checking Game Compatibility
1. Click on any game in your library
2. View the "System Compatibility" section
3. See minimum, recommended, and ultra requirements
4. Check estimated FPS for your system

### Performance Analysis
1. Navigate to the Performance Cockpit
2. View your system specifications and scores
3. Check bottleneck analysis
4. Review upgrade recommendations with costs

### Getting Recommendations
1. Go to Perfect Play Selector
2. Select your mood and preferred genres
3. Choose available playtime
4. Get personalized recommendations

## Legal & Privacy

### ⚠️ Disclaimer
GamePilot is **proprietary software** owned by Moz. See [DISCLAIMER.md](../DISCLAIMER.md) for complete legal information.

**Critical Points:**
- ✅ Personal, non-commercial use only
- ❌ **CANNOT be sold or distributed**
- ❌ **CANNOT be used for commercial purposes or profit**
- ❌ **CANNOT be modified or reverse-engineered**
- ❌ **CANNOT be offered as a service (SaaS)**
- ⚖️ **Violation may result in legal action**

### License
GamePilot is proprietary software. See [LICENSE](../LICENSE) for full legal details.

**Key Points:**
- Personal, non-commercial use only
- Cannot be sold or distributed
- Cannot be used commercially
- Cannot be modified or reverse-engineered

### Privacy Policy
See [PRIVACY.md](../PRIVACY.md) for complete details.

**Summary:**
- ✅ Zero data collection
- ✅ Local-only operation
- ✅ No cloud storage
- ✅ No telemetry or tracking
- ✅ Your data, your control

### Terms of Service
See [TERMS.md](../TERMS.md) for complete details.

**Summary:**
- Personal use only
- No warranties provided
- Limited liability
- You're responsible for backups

## System Requirements

### Minimum
- Windows 10 or later
- 4GB RAM
- 500MB free disk space
- Intel i5 or equivalent

### Recommended
- Windows 11
- 8GB+ RAM
- SSD with 1GB free space
- Intel i7 or AMD Ryzen 7

## Data Storage

All GamePilot data is stored locally on your computer:
```
C:\Users\[YourUsername]\AppData\Roaming\GamePilot\
```

You can:
- Backup your data manually
- Export your library at any time
- Delete all data by removing the folder
- Access raw data files directly

## Troubleshooting

### Library Scan Not Finding Games
- Ensure Steam/Epic/GOG are installed in standard locations
- Check that game folders have proper permissions
- Try running GamePilot as Administrator

### Compatibility Showing "Unknown"
- Game may not be in the 770+ game database
- System will estimate compatibility based on your hardware
- Check Game Modal for detailed analysis

### Performance Page Not Updating
- Refresh the page or restart GamePilot
- Ensure library has been scanned
- Check that system info was detected correctly

## Support & Contact

For issues, questions, or suggestions, contact the author directly.

## Changelog

### v1.1.0 (March 14, 2026)
- ✅ Added 770+ game compatibility database
- ✅ Integrated real-time compatibility badges
- ✅ Added detailed system requirements modal
- ✅ Implemented Performance Cockpit analysis
- ✅ Added multi-currency support for upgrade costs
- ✅ Improved GPU scoring accuracy
- ✅ User-friendly compatibility labels

### v1.0.0 (Previous)
- Initial release with library management and basic features

---

**GamePilot is your personal gaming companion. Enjoy!** 🎮
