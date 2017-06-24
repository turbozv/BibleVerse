
var sqlite3 = require('sqlite3');
var dbBible = new sqlite3.Database('bible.db');
var dbFeedback = new sqlite3.Database('feedback.db');
var dbLog = new sqlite3.Database('log.db');
var fs = require('fs');
var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var jsonParser = bodyParser.json()

class Logger {
  constructor(req, client) {
    this.req = req;
    this.client = client;
    this.err = null;
    this.startTime = new Date();
  }

  getTime() {
    const now = new Date();
    return { date: now.toLocaleDateString() + ' ' + now.toLocaleTimeString(), time: now - this.startTime };
  }

  error(err) {
    this.err = err;
    this.log();
  }

  succeed() {
    this.err = null;
    this.log();
  }

  log() {
    const dt = this.getTime();
    const data = { date: dt.date, time: dt.time, ip: this.req.ip, path: this.req.path, device: this.client, err: this.err };
    console.log(JSON.stringify(data));

    dbLog.serialize(function () {
      var stmt = dbLog.prepare("INSERT INTO log(ip, path, deviceId, sessionId, lang, platformOS, text) VALUES(?,?,?,?,?,?,?)");
      stmt.run(data.ip, data.path, data.device.deviceId, data.device.sessionId, data.device.language, data.device.platformOS, data.err ? data.err : '');
      stmt.finalize();
    });
  }
}

function getRequestValue(req, name) {
  const nameLower = name.toLowerCase();
  if (req.query[nameLower]) {
    return req.query[nameLower];
  }

  if (req.headers[nameLower]) {
    return req.headers[nameLower];
  }

  return '';
}

function getClientInfo(req) {
  let language = getRequestValue(req, 'lang');
  if (language != 'cht' && language != 'eng' && language != 'chs') {
    language = 'chs';
  }
  let deviceId = getRequestValue(req, 'deviceId');
  let sessionId = getRequestValue(req, 'sessionId');
  let platformOS = getRequestValue(req, 'platformOS');
  let deviceYearClass = getRequestValue(req, 'deviceYearClass');

  return { deviceId, sessionId, language, ip: req.ip, platformOS, deviceYearClass };
}

function getVerseRange(verse) {
  const bookPos = verse.indexOf('/');
  const book = verse.substring(0, bookPos);
  verse = verse.substring(bookPos + 1);

  const rangePos = verse.indexOf('-');
  if (rangePos != -1) {
    verseStart = verse.substring(0, rangePos);
    verseEnd = verse.substring(rangePos + 1);
  } else {
    verseStart = verse;
    verseEnd = null;
  }

  result = verseStart.split(':');
  if (result.length == 2) {
    chapter1 = parseInt(result[0]);
    verse1 = parseInt(result[1]);
  } else {
    return null;
  }

  if (verseEnd == null) {
    chapter2 = chapter1;
    verse2 = verse1;
  } else {
    result = verseEnd.split(':');
    if (result.length == 2) {
      chapter2 = parseInt(result[0]);
      verse2 = parseInt(result[1]);
    } else if (result.length == 1) {
      chapter2 = chapter1;
      verse2 = parseInt(result[0]);
    } else {
      return null;
    }
  }

  return { start: book * 1000000 + chapter1 * 1000 + verse1, end: book * 1000000 + chapter2 * 1000 + verse2 };
}

function sendResultText(res, text) {
  res.setHeader('content-type', 'application/json');
  res.send(text);
}

function sendResultObject(res, obj) {
  sendResultText(res, JSON.stringify(obj));
}

function sendErrorObject(res, status, obj) {
  res.status(status);
  sendResultText(res, JSON.stringify(obj));
}

// GET method route
app.get('/verse/*', function (req, res) {
  const client = getClientInfo(req);
  var logger = new Logger(req, client);
  const query = req.params[0];
  verseRange = getVerseRange(query);
  if (verseRange == null) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
  } else {
    let result = { paragraphs: [] };
    let resultChapter = { id: parseInt(verseRange.start / 1000 % 1000), title: '', verses: [] }

    dbBible.serialize(function () {
      const sql = "SELECT * FROM " + client.language + " WHERE id>=" + verseRange.start + " AND id<=" + verseRange.end;
      dbBible.each(sql, function (err, row) {
        const chapter = parseInt(row.id / 1000 % 1000);
        const verse = chapter + ":" + row.id % 1000;
        const text = row.text.replace(/\n/g, '');
        if (chapter == resultChapter.id) {
          resultChapter.verses.push({ verse, text });
        } else {
          result.paragraphs.push(resultChapter);
          resultChapter = { id: chapter, title: '', verses: [{ verse, text }] }
        }
      }, function () {
        if (resultChapter.verses.length > 0) {
          result.paragraphs.push(resultChapter);
        }

        sendResultObject(res, result);
        logger.succeed();
      });
    });
  }
})

// GET method route
app.get('/lessons', function (req, res) {
  const client = getClientInfo(req);
  var logger = new Logger(req, client);
  fs.readFile('lessons/' + client.language + '/home.json', 'utf8', function (err, data) {
    if (err) {
      sendResultObject(res, { Error: err.errno });
      logger.error(err);
    } else {
      sendResultText(res, data);
      logger.succeed();
    }
  });
})

// GET method route
app.get('/lessons/*', function (req, res) {
  const client = getClientInfo(req);
  var logger = new Logger(req, client);
  const id = req.params[0];
  if (/[^a-zA-Z0-9\_\-]/.test(id)) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  fs.readFile('lessons/' + client.language + '/' + id + '.json', 'utf8', function (err, data) {
    if (err) {
      sendErrorObject(res, 500, { Error: err.errno });
      logger.error(err);
    } else {
      sendResultText(res, data);
      logger.succeed();
    }
  });
})

// GET method route
app.get('/reports', function (req, res) {
  const key = getRequestValue(req, 'key');
  var config = require('./config.js');
  if (key != config.reportsKey) {
    res.status(404).send();
    return;
  }

  var feedback = [];
  dbFeedback.serialize(function () {
    const sql = "SELECT * FROM FeedbackView";
    dbFeedback.each(sql, function (err, row) {
      feedback.push({ date: row.date, deviceId: row.deviceId, ip: row.ip, comment: row.comment });
    }, function () {
      var log = [];
      dbLog.serialize(function () {
        const sql = "SELECT * FROM LogView";
        dbLog.each(sql, function (err, row) {
          log.push({ date: row.date, path: row.path, deviceId: row.deviceId, lang: row.lang, ip: row.ip, platformOS: row.platformOS, sessionId: row.sessionId, text: row.text });
        }, function () {
          sendResultObject(res, { feedback, log });
        });
      });
    });
  });
})

// POST method route
app.post('/feedback', jsonParser, function (req, res) {
  const client = getClientInfo(req);
  var logger = new Logger(req, client);
  var comment = req.body.comment;
  if (!comment) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  console.log(JSON.stringify({ deviceId: client.deviceId, ip: req.ip, comment }));
  dbFeedback.serialize(function () {
    var stmt = dbFeedback.prepare("INSERT INTO feedback(deviceId, ip, comment) VALUES(?,?,?)");
    stmt.run(client.deviceId, req.ip, comment);
    stmt.finalize();
  });
  res.status(201).send();
  logger.succeed();
})

app.use(bodyParser.text());
app.listen(3000)