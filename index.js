const fs = require('fs');
const https = require('https');

const PORT = 80;
const COVID_DATA_URL = 'https://raw.githubusercontent.com/owid/covid-19-data/master/public/data/owid-covid-data.json';
const COVID_DATA_FILE = 'public/data.json'
const FIRST_DATE = '2020-12-02';

const args = {};

process.argv.forEach(arg => {
  args[arg] = true;
});

// Get the covid data from COVID_DATA_URL and parse the json into parseCovidData
function getCovidData() {
  console.log(`Fetching covid data from ${COVID_DATA_URL}`);
  https.get(COVID_DATA_URL, (res) => {
    let body = '';

    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      try {
        parseCovidData(JSON.parse(body));
      } catch (error) {
        console.error(error.message);
      };
    });

  }).on('error', (error) => {
    console.error(error.message);
  });
}

// Take a json object and parse the covid data from it and write it into COVID_DATA_FILE
function parseCovidData(json) {
  const labels = [];
  const datasets = [];

  // For each country
  Object.keys(json).forEach(key => {
    const country = json[key];
    const data_total = [];
    const data_percent = [];

    // Populate their data
    json[key].data.forEach(dat => {
      if (new Date(dat.date) >= new Date(FIRST_DATE)) {
        data_total.push(dat.total_vaccinations);
        data_percent.push(dat.total_vaccinations_per_hundred);

        if (data_total.length > labels.length) {
          labels.push(dat.date);
        }
      }
    });

    // Add them if they have any data
    if (data_total.filter(dat => dat).length > 0) {
      datasets.push({
        label: country.location,
        borderColor: randomColour(country.location),
        fill: false,
        data_total: data_total,
        data_percent: data_percent
      });
    }
  });

  fs.writeFile(COVID_DATA_FILE, JSON.stringify({ labels, datasets }), err => {
    if (err) console.error(err);
    console.log(`Written covid data to ${COVID_DATA_FILE}`);
  });
}

// Generate a seeded random colour
function randomColour(seed) {
  if (seed == 'World') return 'black';
  return '#' + Math.floor(Math.abs((Math.sin(seed.hashCode()) * 100000) % 1) * 0x1000000).toString(16).padStart(6, '0');
}

// String.hasCode from https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
Object.defineProperty(String.prototype, 'hashCode', {
  value: function() {
    var hash = 0, i, chr;
    for (i = 0; i < this.length; i++) {
      chr   = this.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }
});

getCovidData();

if (!args['--noserver']) {
  setInterval(getCovidData, 1 * 60 * 60 * 1000); // Run every hour
  
  const express = require('express');
  const app = express();
  app.use(express.static('public'));
  app.listen(PORT, () => {
    console.log(`Example app listening at http://localhost:${PORT}`);
  });
}