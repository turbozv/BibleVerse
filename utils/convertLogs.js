var sqlite3 = require('sqlite3-promise')

async function init() {
  let summary = '';
  let details = '';
  var db = new sqlite3.Database('log.db');

  var result = await db.allAsync('SELECT * FROM logView');
  var inserts = 'use cbsf;\n';
  for (var i in result) {
    var item = result[i];
    inserts += "INSERT INTO `log`(`date`, `cost`, `ip`, `path`, `deviceId`, `sessionId`, `lang`, `platformOS`, `deviceYearClass`, `text`) VALUES(" +
      `'${item.LocalDate}', ${item.cost}, '${item.ip}', '${item.path}', '${item.deviceId}', '${item.sessionId}', '${item.lang}', '${item.platformOS}', '${item.deviceYearClass}', '${item.text}');\n`;
  }
  console.log(inserts);
}

init();
