var sqlite3 = require('sqlite3-promise')
var geoip = require('geoip-lite');

async function init() {
    let summary = '';
    let details = '';
    var db = new sqlite3.Database('log.db');
    var result = await db.allAsync('SELECT COUNT(*) AS Count FROM logView');
    const totalCount = result[0].Count;
    result = await db.allAsync("SELECT COUNT(DISTINCT deviceId) AS Count from logView WHERE deviceId<>''");
    const totalDevices = result[0].Count;
    result = await db.allAsync("SELECT COUNT(DISTINCT sessionId) AS Count from logView WHERE sessionId<>''");
    const totalSessions = result[0].Count;
    result = await db.allAsync("SELECT SUM(cost) AS Count from logView");
    const totalCost = result[0].Count;
    result = await db.allAsync('SELECT DATE(LocalDate) AS Date FROM logView ORDER BY LocalDate ASC LIMIT 1');
    const startDate = result[0].Date;
    result = await db.allAsync('SELECT DATE(LocalDate) AS Date FROM logView ORDER BY LocalDate DESC LIMIT 1');
    const endDate = result[0].Date;
    summary += ("Start date, " + startDate) + "\n";
    summary += ("End date, " + endDate) + "\n";
    summary += ("Total requests, " + totalCount) + "\n";
    summary += ("Total unique devices, " + totalDevices) + "\n";
    summary += ("Total sessions, " + totalSessions) + "\n";
    summary += ("Average response time, " + (totalCost / totalCount).toFixed(2) + "ms") + "\n";

    details += "Date, Requests, Unique devices, Sessions\n";
    var start = new Date(startDate);
    var end = new Date(endDate);
    while (start <= end) {
        date = start.toISOString().substring(0, 10);
        resultByDays = [];
        for (var i in result) {
            resultDayCount = await db.allAsync("SELECT COUNT(*) AS Count from logView WHERE DATE(LocalDate)='" + date + "'");
            resultDayDevices = await db.allAsync("SELECT COUNT(DISTINCT deviceId) AS Count from logView WHERE deviceId<>'' AND DATE(LocalDate)='" + date + "'");
            resultDaySessions = await db.allAsync("SELECT COUNT(DISTINCT sessionId) AS Count from logView WHERE sessionId<>'' AND DATE(LocalDate)='" + date + "'");
            resultByDays.push({
                Count: resultDayCount[0].Count,
                Devices: resultDayDevices[0].Count,
                Sessions: resultDaySessions[0].Count
            });
            details += (date) + ", " + (resultDayCount[0].Count) + ", " + (resultDayDevices[0].Count) + ", " + (resultDaySessions[0].Count) + "\n";
        }

        start.setDate(start.getDate() + 1);
    }

    details += "\nDeviceId, Language, LastSeen, DaysSinceLastVisit\n";
    result = await db.allAsync("SELECT DISTINCT deviceId from logView WHERE deviceId<>''");
    devices = [];
    langs = {};
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    for (var i in result) {
        devices.push(result[i].deviceId);
    }
    for (var i in devices) {
        const deviceId = devices[i];
        result = await db.allAsync("SELECT lang, LocalDate FROM logView WHERE deviceId='" + deviceId + "' AND path='/lessons/' ORDER BY date DESC LIMIT 1");
        const lang = result[0].lang;
        const lastSeen = result[0].LocalDate;
        var diffDays = Math.round(Math.abs((now.getTime() - (new Date(lastSeen)).getTime()) / oneDay));
        details += (deviceId + ", " + lang + ', ' + lastSeen + ', ' + diffDays) + "\n";
        if (langs[lang]) {
            langs[lang]++;
        } else {
            langs[lang] = 1;
        }
    }

    summary += "\nLanguage, DeviceCount, Percentage\n";
    for (var i in langs) {
        summary += (i + ', ' + langs[i] + ', ' + (langs[i] * 100 / totalDevices).toFixed(1) + '%') + "\n";
    }

    summary += "\nIP, Country, Region, City, Zip\n";
    result = await db.allAsync("SELECT DISTINCT substr(ip, 8) AS IP FROM log ORDER BY IP ASC");
    for (var i in result) {
        const ip = result[i].IP;
        const geo = geoip.lookup(ip);
        summary += ip + ', ' + geo.country + ', ' + geo.region + ', ' + geo.city + ',' + geo.zip + '\n';
    }

    //console.log('===== Summary =====');
    console.log(summary);
    //console.log('===== Details =====');
    console.log(details);
}

init();
