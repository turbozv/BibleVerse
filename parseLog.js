var sqlite3 = require('sqlite3-promise')

async function init() {
    let html = '';
    var db = new sqlite3.Database('log.db');
    var result = await db.allAsync('SELECT COUNT(*) AS Count FROM logView');
    const totalCount = result[0].Count;
    result = await db.allAsync("SELECT COUNT(DISTINCT deviceId) AS Count from logView WHERE deviceId<>''");
    const totalDevices = result[0].Count;
    result = await db.allAsync("SELECT COUNT(DISTINCT sessionId) AS Count from logView WHERE sessionId<>''");
    const totalSessions = result[0].Count;
    result = await db.allAsync("SELECT SUM(cost) AS Count from logView");
    const totalCost = result[0].Count;
    html += ("Total count: " + totalCount) + "<br>\n";
    html += ("Total devices: " + totalDevices) + "<br>\n";
    html += ("Total sessions: " + totalSessions) + "<br>\n";
    html += ("Average response time: " + (totalCost / totalCount).toFixed(2) + "ms") + "<br>\n";

    result = await db.allAsync("SELECT DISTINCT DATE(LocalDate) AS Days from logView ORDER BY Days DESC");
    resultByDays = [];
    for (var i in result) {
        const date = result[i].Days;
        html += ("-- " + date + " --") + "<br>\n";
        resultDayCount = await db.allAsync("SELECT COUNT(*) AS Count from logView WHERE DATE(LocalDate)='" + date + "'");
        resultDayDevices = await db.allAsync("SELECT COUNT(DISTINCT deviceId) AS Count from logView WHERE deviceId<>'' AND DATE(LocalDate)='" + date + "'");
        resultDaySessions = await db.allAsync("SELECT COUNT(DISTINCT sessionId) AS Count from logView WHERE sessionId<>'' AND DATE(LocalDate)='" + date + "'");
        resultByDays.push({
            Count: resultDayCount[0].Count,
            Devices: resultDayDevices[0].Count,
            Sessions: resultDaySessions[0].Count
        });
        html += ("Count: " + resultDayCount[0].Count) + "<br>\n";
        html += ("Devices: " + resultDayDevices[0].Count) + "<br>\n";
        html += ("Sessions: " + resultDaySessions[0].Count) + "<br>\n";
    }

    console.log(html);
}

init();
