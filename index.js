
var sqlite3 = require('sqlite3');
var dbBible = new sqlite3.Database('bible.db');
var dbFeedback = new sqlite3.Database('feedback.db');
var fs = require('fs');
var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var jsonParser = bodyParser.json()

class Logger {
  constructor(req, language) {
    this.req = req;
    this.language = language;
    this.startTime = new Date();
  }

  error(err) {
    const now = new Date();
    const time = now - this.startTime;
    const date = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
    console.log(JSON.stringify({ date: new Date(), path: this.req.path, ip: this.req.ip, lang: this.language, time, err: JSON.stringify(err) }));
  }

  succeed() {
    const now = new Date();
    const time = now - this.startTime;
    const date = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
    console.log(JSON.stringify({ date, path: this.req.path, ip: this.req.ip, lang: this.language, time }));
  }
}

function getClientInfo(req) {
  let language = '';
  if (req.query.lang) {
    language = req.query.lang.toLowerCase();
  } else if (req.headers.language) {
    language = req.headers.language.toLowerCase();
  }

  if (language != 'cht' && language != 'eng' && language != 'chs') {
    language = 'chs';
  }

  let deviceId = '';
  if (req.query.deviceId) {
    deviceId = req.query.deviceId.toLowerCase();
  } else if (req.headers.deviceId) {
    deviceId = req.headers.deviceId.toLowerCase();
  }

  return { language, deviceId };
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

  startIndex = book * 1000000 + chapter1 * 1000 + verse1;

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

  endIndex = book * 1000000 + chapter2 * 1000 + verse2;

  return { start: startIndex, end: endIndex };
}

function sendResultText(res, result) {
  res.setHeader('content-type', 'application/json');
  res.send(result);
}

function sendResultObject(res, obj) {
  res.setHeader('content-type', 'application/json');
  res.send(JSON.stringify(obj));
}

function sendErrorObject(res, status, obj) {
  res.setHeader('content-type', 'application/json');
  res.status(status).send(JSON.stringify(obj));
}

// GET method route
app.get('/verse/*', function (req, res) {
  const client = getClientInfo(req);
  var logger = new Logger(req, client.language);
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
  var logger = new Logger(req, client.language);
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
  var logger = new Logger(req, client.language);
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

// POST method route
app.post('/feedback', jsonParser, function (req, res) {
  const client = getClientInfo(req);
  var logger = new Logger(req, client.language);
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
  res.status(201).send({});
  logger.succeed();
})

app.use(bodyParser.text());
app.listen(3000)