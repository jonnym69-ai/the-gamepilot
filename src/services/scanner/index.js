const { scanSteamLibrary } = require('./steamScanner');
const { scanEALibrary } = require('./eaScanner');
const { scanRockstarLibrary } = require('./rockstarScanner');
const { scanAmazonLibrary } = require('./amazonScanner');
const { scanItchLibrary } = require('./itchScanner');

module.exports = {
  scanSteamLibrary,
  scanEALibrary,
  scanRockstarLibrary,
  scanAmazonLibrary,
  scanItchLibrary
};
