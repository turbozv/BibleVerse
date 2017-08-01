var sqlite3 = require('sqlite3-promise')

async function init() {
    var db = new sqlite3.Database('log.db');
    var result = await db.allAsync('SELECT * FROM logView');
    console.log(result);
}

init();
