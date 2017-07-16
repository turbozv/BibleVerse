var sqlite3 = require('sqlite3');
var fs = require('fs');
var bodyParser = require('body-parser');
var express = require('express');
var https = require('https');
var json2csv = require('json2csv');
var config = require('./config.js');

var dbBible = new sqlite3.Database('bible.db');
var dbFeedback = new sqlite3.Database('feedback.db');
var dbLog = new sqlite3.Database('log.db');
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
    const data = { date: dt.date, cost: dt.time, ip: this.req.ip, path: this.req.path, device: this.client, err: this.err };
    console.log(JSON.stringify(data));

    dbLog.serialize(function () {
      var stmt = dbLog.prepare("INSERT INTO log(cost, ip, path, deviceId, sessionId, lang, platformOS, text) VALUES(?,?,?,?,?,?,?,?)");
      stmt.run(data.cost, data.ip, data.path, data.device.deviceId, data.device.sessionId, data.device.language, data.device.platformOS, data.err ? data.err : '');
      stmt.finalize();
    });
  }
}

function getRequestValue(req, name) {
  if (req.query[name]) {
    return req.query[name];
  }
  const nameLower = name.toLowerCase();
  if (req.query[nameLower]) {
    return req.query[nameLower];
  }

  if (req.headers[name]) {
    return req.headers[name];
  }
  if (req.headers[nameLower]) {
    return req.headers[nameLower];
  }

  return '';
}

function getClientInfo(req) {
  let language = getRequestValue(req, 'lang');
  if (['chs', 'cht', 'eng', 'spa'].indexOf(language.toLowerCase()) == -1) {
    language = 'chs';
  }
  let deviceId = getRequestValue(req, 'deviceId');
  let sessionId = getRequestValue(req, 'sessionId');
  let platformOS = getRequestValue(req, 'platformOS');
  let deviceYearClass = getRequestValue(req, 'deviceYearClass');
  let cellphone = getRequestValue(req, 'cellphone');
  let bibleVersion = getRequestValue(req, 'bibleVersion');
  if (['rcuvss', 'rcuvts', 'niv2011', 'asv', 'kjv'].indexOf(bibleVersion.toLowerCase()) == -1) {
    bibleVersion = 'rcuvss';
  }

  return { deviceId, sessionId, language, ip: req.ip, platformOS, deviceYearClass, cellphone, bibleVersion };
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

function sendResultCsv(res, result, filename) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats');
  res.setHeader("Content-Disposition", "attachment; filename=" + filename + ".csv");
  res.send(result);
}

function sendErrorObject(res, status, obj) {
  res.status(status);
  sendResultText(res, JSON.stringify(obj));
}

// Get Bible verse
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
      const sql = "SELECT * FROM " + client.bibleVersion + " WHERE id>=" + verseRange.start + " AND id<=" + verseRange.end;
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

// Get lessons (home page)
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

// Get each lesson
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

// Get reports
app.get('/reports', function (req, res) {
  if (getRequestValue(req, 'key') != config.reportsKey) {
    res.status(404).send();
    return;
  }

  var feedback = [];
  var html = "<hr>Feedbacks:<br>";
  var index = 0;
  dbFeedback.serialize(function () {
    const sql = "SELECT * FROM FeedbackView";
    dbFeedback.each(sql, function (err, row) {
      html += "#" + (++index) + ":" + JSON.stringify(row) + "<br>";
    }, function () {
      var log = [];
      html += "<hr>Logs:<br>";
      index = 0;
      dbLog.serialize(function () {
        const sql = "SELECT * FROM LogView";
        dbLog.each(sql, function (err, row) {
          html += "#" + (++index) + ":" + JSON.stringify(row) + "<br>";
        }, function () {
          res.send(html);
        });
      });
    });
  });
})

// Get logs
app.get('/logs', function (req, res) {
  if (getRequestValue(req, 'key') != config.reportsKey) {
    res.status(404).send();
    return;
  }

  const fields = ['LocalDate', 'cost', 'ip', 'path', 'deviceId', 'sessionId', 'lang', 'platformOS', 'text'];
  var data = [];
  dbLog.serialize(function () {
    const sql = "SELECT * FROM LogView";
    dbLog.each(sql, function (err, row) {
      data.push(row);
    }, function () {
      sendResultCsv(res, json2csv({ data, fields }), 'logs');
    });
  });
})

// Get feedbacks
app.get('/feedbacks', function (req, res) {
  if (getRequestValue(req, 'key') != config.reportsKey) {
    res.status(404).send();
    return;
  }

  const fields = ['LocalDate', 'deviceId', 'ip', 'comment'];
  var data = [];
  dbFeedback.serialize(function () {
    const sql = "SELECT * FROM FeedbackView";
    dbFeedback.each(sql, function (err, row) {
      data.push(row);
    }, function () {
      sendResultCsv(res, json2csv({ data, fields }), 'feedbacks');
    });
  });
})

// Get Logon
app.get('/logon', function (req, res) {
  const client = getClientInfo(req);
  var logger = new Logger(req, client);
  if (!client.cellphone) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  // test account
  if (client.cellphone == '4250000000') {
    sendResultObject(res, { logon: true });
    logger.succeed();
    return;
  }

  const options = {
    host: 'resources.bsfinternational.org',
    port: 443,
    path: '/BSFAjaxUtils/Dispatch?action=AjaxGetClassMeetingInfo&phoneNumber=' + client.cellphone,
    method: 'GET'
  };

  const bsfReq = https.request(options, (bsfRes) => {
    bsfRes.on('data', (d) => {
      const body = d.toString('utf8');
      const result = JSON.parse(body);
      if (result && result.length > 0) {
        sendResultObject(res, { logon: true });
        logger.succeed();
      } else {
        sendErrorObject(res, 404, { Error: "No such user" });
        logger.error("No such user");
      }
    });
  });

  bsfReq.on('error', (e) => {
    sendErrorObject(res, 404, { Error: e.message });
    logger.error(e.message);
  });

  bsfReq.end();
})

// Post feedback
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
