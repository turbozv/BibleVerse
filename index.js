let sqlite3 = require('sqlite3');
let fs = require('fs');
let bodyParser = require('body-parser');
let https = require('https');
let config = require('./config.js');
let mysql = require('mysql');
let util = require('util');
let app = require('express')();
let http = require('http').Server(app);
let io = require('socket.io')(http);
const nodemailer = require('nodemailer');

let dbBible = new sqlite3.Database('bible.db');
let jsonParser = bodyParser.json()
let mysqlConn = mysql.createConnection({ host: config.mysqlServer, user: config.mysqlUser, password: config.mysqlPassword, database: config.mysqlDatabase, timezone: 'pst', charset: 'utf8mb4' });

// node native promisify
const mysqlQuery = util.promisify(mysqlConn.query).bind(mysqlConn);

// Keep connection alive
mysqlConn.connect();

const ValidLanguages = ["chs", "cht", "eng", "spa"];
const ValidBibleVersions = ['afr53', 'afr83', 'akjv', 'alab', 'amp', 'ampc', 'apsd', 'arc09', 'asv', 'avddv', 'bcnd', 'bdc', 'bdk', 'bds', 'bhn', 'bhti', 'bimk', 'bjb', 'bk', 'bl92', 'bm', 'bmdc', 'bpt', 'bpv', 'bysb', 'ccb', 'ceb', 'cev', 'cevd', 'cjb', 'cnvs', 'cnvt', 'csbs', 'cunpss', 'cunpts', 'darby', 'dhh', 'dnb1930', 'dra', 'erv', 'ervar', 'ervhi', 'ervmr', 'ervne', 'ervor', 'ervpa', 'ervta', 'ervur', 'esv', 'exb', 'fnvdc', 'gnt', 'gnv', 'gw', 'hau', 'hcsb', 'hcv', 'hhh', 'hlgn', 'hnzri', 'htb', 'icb', 'igbob', 'isv', 'jnt', 'jub', 'kj21', 'kjv', 'kpxnt', 'leb', 'lsg', 'maori', 'mbb05', 'mev', 'mounce', 'msg', 'n11bm', 'n78bm', 'nabre', 'nasb', 'natwi', 'nav', 'nbg51', 'nblh', 'ncv', 'neg1979', 'net', 'ngude', 'nirv', 'niv1984', 'niv2011', 'nivuk', 'nkjv', 'nlt', 'nlt2013', 'nlv', 'nog', 'nr2006', 'nrsv', 'nrsva', 'nrt', 'nso00', 'nso51', 'ntlr', 'ntv', 'nvi', 'nvipt', 'ojb', 'okyb', 'ondb', 'phillips', 'pmpv', 'pnpv', 'rcpv', 'rcuvss', 'rcuvts', 'ripv', 'rnksv', 'rsv', 'rsvce', 'rvc', 'rvr1995', 'rvr60', 'rvr95', 'rvv11', 'rwv', 'sblgnt', 'sch2000', 'seb', 'sg21', 'snd', 'snd12', 'spynt', 'sso89so', 'suv', 'swt', 'synod', 'tb', 'tbov', 'tcl02', 'th1971', 'tla', 'tlb', 'tlv', 'tr1550', 'tr1894', 'tso29no', 'tso89', 'tsw08no', 'tsw70', 'urd', 'ven98', 'voice', 'web', 'webbe', 'wlc', 'wyc', 'xho75', 'xho96', 'ylt', 'zomi', 'zul59'];
const AnnotationWords = ['the', 'in', 'of', 'on', 'and', 'an', 'to', 'a', 'for'];

class Logger {
  constructor(req, client) {
    this.req = req;
    this.client = client;
    this.text = '';
    this.startTime = new Date();
  }

  getTime() {
    const now = new Date();
    return { date: getYYYYMMDD(now) + ' ' + now.toLocaleTimeString(), time: now - this.startTime };
  }

  error(err) {
    this.text = err;
    this.log();
  }

  done(text) {
    this.text = text;
    this.log();
  }

  succeed() {
    this.log();
  }

  log() {
    const startTime = new Date();
    const dt = this.getTime();
    const data = {
      cost: dt.time,
      ip: this.req.ip.replace('::ffff:', ''),
      path: this.req.path,
      deviceId: this.client.deviceId,
      sessionId: this.client.sessionId,
      lang: this.client.language,
      platformOS: this.client.platformOS,
      deviceYearClass: this.client.deviceYearClass,
      text: this.text ? this.text : '',
      version: this.client.version,
      bibleVersion: this.client.bibleVersion
    };
    mysqlConn.query('INSERT INTO log SET ?', data, function (error, results, fields) {
      if (error) {
        console.log(JSON.stringify(error));
      }
      else {
        const now = new Date();
        console.log(`${now.toLocaleString()} LogCost:${now - startTime} ${JSON.stringify(data)}`);
      }
    });
  }
}

function getYYYYMMDD(date) {
  return date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate();
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

function getVerseText(verseText) {
  // Check to see if the first line is part of the bible
  const firstLinePos = verseText.indexOf('\n');
  if (firstLinePos !== -1) {
    const firstLine = verseText.substring(0, firstLinePos);
    let annotation = true;
    if (verseText.length > firstLinePos) {
      // We have more than one lines
      let words = firstLine.split(' ');
      // It has to be more than one words
      if (words.length > 1) {
        // Check each word starts with upper case
        for (let w in words) {
          if (AnnotationWords.indexOf(words[w]) === -1 && words[w][0] !== words[w][0].toUpperCase()) {
            // Not upper case, not an annotation
            annotation = false;
            break;
          }
        }

        // Use "()" for annotation if found
        if (annotation) {
          verseText = '[' + firstLine + '] ' + verseText.substring(firstLinePos + 1);
        }
      }
    }
  }

  return verseText;
}

function getClientInfo(req) {
  let language = getRequestValue(req, 'lang');
  if (ValidLanguages.indexOf(language.toLowerCase()) === -1) {
    language = 'chs';
  }
  let deviceId = getRequestValue(req, 'deviceId');
  let sessionId = getRequestValue(req, 'sessionId');
  let platformOS = getRequestValue(req, 'platformOS');
  let deviceYearClass = getRequestValue(req, 'deviceYearClass');
  let cellphone = getRequestValue(req, 'cellphone');
  let bibleVersion = getRequestValue(req, 'bibleVersion');
  let version = getRequestValue(req, 'version');
  if (ValidBibleVersions.indexOf(bibleVersion.toLowerCase()) === -1) {
    bibleVersion = 'rcuvss';
  }

  if (bibleVersion === 'rcuvss') bibleVersion = 'cunpss';
  if (bibleVersion === 'rcuvts') bibleVersion = 'cunpts';

  return { deviceId, sessionId, language, ip: req.ip.replace('::ffff:', ''), platformOS, deviceYearClass, cellphone, bibleVersion, version };
}

function getVerseRange(verse) {
  const bookPos = verse.indexOf('/');
  const book = verse.substring(0, bookPos);
  verse = verse.substring(bookPos + 1);

  const rangePos = verse.indexOf('-');
  if (rangePos !== -1) {
    verseStart = verse.substring(0, rangePos);
    verseEnd = verse.substring(rangePos + 1);
  } else {
    verseStart = verse;
    verseEnd = null;
  }

  result = verseStart.split(':');
  if (result.length === 2) {
    chapter1 = parseInt(result[0]);
    verse1 = parseInt(result[1]);
  } else {
    return null;
  }

  if (verseEnd === null) {
    chapter2 = chapter1;
    verse2 = verse1;
  } else {
    result = verseEnd.split(':');
    if (result.length === 2) {
      chapter2 = parseInt(result[0]);
      verse2 = parseInt(result[1]);
    } else if (result.length === 1) {
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

// Get Bible verse
app.get('/verse/*', function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const query = req.params[0];
  verseRange = getVerseRange(query);
  if (verseRange === null) {
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
        const text = getVerseText(row.text).replace(/\n/g, ' ').replace(/&nbsp;/g, ' ');
        if (chapter === resultChapter.id) {
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
  let logger = new Logger(req, client);
  fs.readFile(`lessons/${client.language}/home.json`, 'utf8', function (err, data) {
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
  let logger = new Logger(req, client);
  const id = req.params[0];
  if (/[^a-zA-Z0-9\_\-]/.test(id)) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  fs.readFile(`lessons/${client.language}/${id}.json`, 'utf8', function (err, data) {
    if (err) {
      sendErrorObject(res, 500, { Error: err.errno });
      logger.error(err);
    } else {
      sendResultText(res, data);
      logger.succeed();
    }
  });
})

// Get Logon
app.get('/logon', function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  if (!client.cellphone) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
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

// Get attendance '/cellphone/{group}/{date}'
app.get('/attendanceV2/*', async function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const data = req.params[0].split('/');
  if (!data || data.length < 1 || data.length > 3) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  const cellphone = data[0];
  if (!cellphone) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  // Optional group and date
  let group = data.length >= 1 ? parseInt(data[1]) : null;
  let date = data.length >= 2 ? data[2] : null;
  try {
    // Find out the leader's information
    var result = await mysqlQuery('SELECT id, CONCAT(cname, " ", name) as name, class FROM users WHERE cellphone=? ORDER BY class DESC, role ASC, registerDate DESC LIMIT 1', [cellphone]);
    if (result.length === 0) {
      sendErrorObject(res, 401, { Error: "No such user" });
      logger.error("No such user");
      return;
    }
    const user = result[0];

    let groups = [];
    if (!group) {
      // Find out groups information
      var result = await mysqlQuery('SELECT `group` FROM attendanceLeaders WHERE leader=? AND class=?', [user.id, user.class]);
      if (result.length === 0) {
        sendErrorObject(res, 401, { Error: "No permission" });
        logger.error("No permission");
        return;
      }
      groups = result.map(item => item.group);
    } else {
      groups = [group];
    }

    // Get group names
    let groupNames = [];
    result = await mysqlQuery('SELECT groupId, name FROM groups WHERE class=?', [user.class]);
    if (result.length > 0) {
      result.map(item => groupNames[item.groupId] = item.name);
    }

    let response = [];

    for (let i in groups) {
      let currentGroup = { class: user.class, group: groups[i], date: date ? date : new Date().toLocaleDateString() };

      if (groupNames[currentGroup.group]) {
        currentGroup.name = groupNames[currentGroup.group];
      }

      // Get attendees
      if (currentGroup.group === 0) {
        // Co-worker group includes all GL (which is not in group#0)
        result = await mysqlQuery('SELECT id, CONCAT(cname, " ", name) as name, cellphone FROM users WHERE class=? AND ((`group`=? AND role!=255) OR (`group` != 0 AND role=6)) ORDER BY role, name ASC', [user.class, currentGroup.group]);
      } else {
        result = await mysqlQuery('SELECT id, CONCAT(cname, " ", name) as name, cellphone FROM users WHERE class=? AND `group`=? ORDER BY role, name ASC', [user.class, currentGroup.group]);
      }

      let attendees = result.map(item => { return { id: item.id, name: item.name, cellphone: item.cellphone }; });
      currentGroup.attendees = attendees;

      if (!date) {
        //Find the most recent one
        result = await mysqlQuery('SELECT date FROM attendance WHERE class=? AND `group`=? ORDER BY date DESC LIMIT 1', [user.class, currentGroup.group]);
        if (result.length > 0) {
          // Set the attendance date
          currentGroup.date = getYYYYMMDD(result[0].date);
        }
      }

      // Get users from all groups
      result = await mysqlQuery('SELECT users FROM `attendance` WHERE `group`=? AND class=? AND date=? ORDER BY submitDate DESC LIMIT 1', [currentGroup.group, currentGroup.class, currentGroup.date]);

      let checkedInUsers = [];
      if (result.length > 0) {
        checkedInUsers = JSON.parse(result[0].users);

        for (let i in attendees) {
          if (checkedInUsers.includes(attendees[i].id)) {
            attendees[i].checked = true;
          }
        }
      }

      currentGroup.attendees = attendees;

      response.push(currentGroup);
    }

    sendResultObject(res, response);
    logger.succeed();

  } catch (error) {
    console.log(error);
    sendErrorObject(res, 400, { Error: JSON.stringify(error) });
    logger.error(error);
  }
});

// Get teaching audio
app.get('/audio/*', function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const cellphone = req.params[0];
  if (!cellphone) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  const lesson = req.query['lesson'];
  let query;
  if (lesson) {
    query = {
      sql: 'SELECT audios.lesson, audios.notes, audios.seminar FROM users INNER JOIN audios WHERE cellphone=? AND lesson=? AND audio=1',
      values: [cellphone, lesson]
    };
  } else {
    query = {
      sql: 'SELECT audios.lesson, audios.notes, audios.seminar FROM users INNER JOIN audios WHERE cellphone=? AND audio=1 ORDER BY audios.id DESC LIMIT 1',
      values: [cellphone]
    };
  }

  mysqlConn.query(query, function (error, result, fields) {
    if (error) {
      sendErrorObject(res, 400, { Error: JSON.stringify(error) });
      logger.error(error);
    } else if (result.length == 0) {
      sendErrorObject(res, 400, { Error: "Invalid user or no permission" });
      logger.error();
    } else {
      if (getRequestValue(req, 'playNotes') === '1') {
        const file = `audios/${result[0].notes}.mp3`;
        res.download(file);
      } else if (getRequestValue(req, 'playSeminar') === '1') {
        const file = `audios/${result[0].seminar}.mp3`;
        res.download(file);
      } else if (getRequestValue(req, 'play') === '1') {
        const file = `audios/${result[0].lesson}.mp3`;
        res.download(file);
      } else {
        sendResultText(res, '');
      }
      logger.succeed();
    }
  });
})

// Get teaching audio info
app.get('/audioInfo/*', async function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const cellphone = client.cellphone;
  if (!cellphone) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  const lesson = req.params[0];
  if (lesson && /[^a-zA-Z0-9\_]/.test(lesson)) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  if (lesson) {
    result = await mysqlQuery('SELECT audios.lesson, audios.message, audios.notes, audios.notes_message, audios.seminar, audios.seminar_message FROM users INNER JOIN audios WHERE cellphone=? AND lesson=? AND audio=1 AND users.class=2',
      [cellphone, lesson]);
  } else {
    result = await mysqlQuery('SELECT audios.lesson, audios.message, audios.notes, audios.notes_message, audios.seminar, audios.seminar_message FROM users INNER JOIN audios WHERE cellphone=? AND audio=1 AND users.class=2 ORDER BY audios.id DESC LIMIT 1',
      [cellphone]);
  }
  if (result.length === 0) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.succeed();
    return;
  }

  sendResultObject(res, result[0]);
  logger.succeed();
})

// Get user information
app.get('/user/*', async function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const cellphone = req.params[0];
  if (!cellphone) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  try {
    // Get users from all groups
    let result = await mysqlQuery('SELECT lesson FROM audios');

    let audios = [];
    for (let i in result) {
      audios.push(result[i].lesson);
    }

    result = await mysqlQuery('SELECT id, name, audio, class, role FROM users WHERE cellphone=? ORDER BY class DESC, role ASC, registerDate DESC LIMIT 1', [cellphone]);
    if (result.length === 0) {
      sendErrorObject(res, 400, { Error: "Invalid user" });
      logger.succeed();
      return;
    }
    const user = result[0];

    result = await mysqlQuery('SELECT `group` FROM attendanceLeaders WHERE leader=?', [user.id]);
    let attendanceGroups = [];
    for (let i in result) {
      attendanceGroups.push(result[i].group);
    }

    const data = {
      audio: user.audio,
      class: user.class,
      isGroupLeader: ([0, 1, 2, 3, 4, 6, 7, 9, 10, 11].indexOf(user.role) !== -1),
      chat: 1,
      attendanceGroups
    };
    if (data.audio) {
      data.audios = audios;
    }
    sendResultObject(res, data);
    logger.succeed();

  } catch (error) {
    console.log(error);
    sendErrorObject(res, 400, { Error: JSON.stringify(error) });
    logger.error(error);
  }
})

// Post attendance
app.post('/attendanceV2', jsonParser, async function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  if (!req.body || !req.body.date || !req.body.users || !client.cellphone || !req.body.class || req.body.group == null) {
    sendErrorObject(res, 401, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  try {
    // Verify user has the permission
    let result = await mysqlQuery('SELECT users.id as id FROM attendanceLeaders INNER JOIN users ON users.id=attendanceLeaders.leader WHERE users.class=? AND attendanceLeaders.`group`=? AND users.cellphone=?',
      [req.body.class, req.body.group, client.cellphone]);
    if (result.length === 0) {
      sendErrorObject(res, 400, { Error: "Invalid user or no permission" });
      logger.error();
    }

    // TODO: Verify users
    const data = {
      date: req.body.date,
      leader: result[0].id,
      group: req.body.group,
      users: JSON.stringify(req.body.users),
    };

    result = await mysqlQuery('INSERT INTO attendance SET ?', data);

    res.status(201).send();
    logger.succeed();

  } catch (error) {
    console.log(error);
    sendErrorObject(res, 400, { Error: JSON.stringify(error) });
    logger.error(error);
  }
})

// Post feedback
app.post('/feedback', jsonParser, function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  let comment = req.body.comment;
  if (!comment) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  const data = {
    ip: req.ip.replace('::ffff:', ''),
    createdAt: new Date().getTime(),
    room: client.deviceId,
    user: client.platformOS + ' ' + client.deviceId,
    message: comment
  };
  mysqlConn.query('INSERT INTO messages SET ?', data, function (error, results, fields) {
    if (error) {
      sendResultObject(res, { Error: error });
      logger.error(error);
    }
    else {
      res.status(201).send();
      logger.succeed();
    }
  });
})

// Post notes
app.post('/save_answer', jsonParser, function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  if (!req.body || !client.cellphone) {
    sendErrorObject(res, 401, { Error: "Invalid input:" });
    logger.error("Invalid input" + JSON.stringify(req.body));
    return;
  }

  let questionId = req.body.question_id;
  if (!questionId || questionId.length === 0) {
    sendErrorObject(res, 400, { Error: "Invalid question ID" });
    logger.error(error);
  }

  const data = {
    date: req.body.date,
    cellphone: client.cellphone,
    question_id: questionId,
    device: client.deviceId,
    answer: req.body.answer
  }

  mysqlConn.query('REPLACE INTO answers SET ?', data, function (error, result, fields) {
    if (error) {
      sendResultObject(res, { Error: error });
      logger.error(error);
    } else {
      res.status(201).send();
      logger.succeed();
    }
  });
})

// Get User answers
app.get('/get_answer/:questionId', jsonParser, function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const cellphone = client.cellphone;
  const question_id = req.params.questionId;

  if (!cellphone || cellphone.length === 0 || !question_id || question_id.length === 0) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  mysqlConn.query({
    sql: 'SELECT answer FROM answers WHERE cellphone=? AND question_id=?',
    values: [cellphone, question_id]
  }, function (error, result, fields) {
    if (error) {
      sendErrorObject(res, 400, { Error: JSON.stringify(error) });
      logger.error(error);
    } else {
      let userAnswer = result.length === 0 ? "" : result[0].answer;
      const data = {
        answer: userAnswer
      };
      sendResultObject(res, data);
      logger.succeed();
    }
  });
})

// Post poke (device call home)
app.post('/poke', jsonParser, function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  res.status(201).send();
  let data = getRequestValue(req, 'data') + (req.body.data ? req.body.data : '');
  logger.done(data);
})

// Get messages for chat/discussion
app.get('/messages/*', function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const room = req.params[0];
  if (!room) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  // TODO: Client queries by timestamp, then messages are merged by client
  mysqlConn.query({
    sql: 'SELECT createdAt, user, message FROM messages WHERE room=? ORDER BY createdAt ASC',
    values: [room]
  }, function (error, result, fields) {
    if (error) {
      sendErrorObject(res, 400, { Error: JSON.stringify(error) });
      logger.error(error);
    } else {
      sendResultObject(res, result);
      logger.succeed();
    }
  });
})

// Set up socket.io for chat server
io.on('connection', function (socket) {
  console.log(`user connected [${socket.handshake.address}]`);

  socket.on('disconnect', function () {
    console.log(`user disconnected [${socket.handshake.address}]`);
  });

  // listen on new message and broadcast it
  socket.on('newMessage', function (data) {
    const ip = socket.handshake.address.replace('::ffff:', '');
    const createdAt = new Date().getTime();
    console.log('newMessage from [' + ip + ']: ' + JSON.stringify(data));

    if (!data.room || !data.user || !data.message) {
      console.log('Invalid message!');
      return;
    }

    // save to database
    const value = {
      ip,
      createdAt,
      room: data.room,
      user: data.user,
      message: data.message
    }
    mysqlConn.query('INSERT INTO messages SET ?', value, function (error, results, fields) {
      if (error) {
        console.log('MySQL error: ' + JSON.stringify(error));
      } else {
        // broadcast it to everyone (including sender)
        io.emit('newMessage', {
          createdAt,
          room: data.room,
          user: data.user,
          message: data.message
        });

        // also send email to admins
        if (data.room.length === 36) {
          const transporter = nodemailer.createTransport({ host: config.mail.host, port: 465, secure: true, auth: { user: config.mail.user, pass: config.mail.pass } });
          const mailOptions = {
            from: config.mail.sender,
            to: config.mail.to,
            subject: 'New feedback from CBSF user',
            text: `${data.user}:\n${data.message}`,
            html: `<b>${data.user}:</b><p>${data.message}`
          };
          transporter.sendMail(mailOptions).then(info => {
            console.log("Message sent: %s", info.messageId);
          });
        }
      }
    });
  });
});

// Delete message
app.delete('/deleteMessage/:createdAt', jsonParser, async function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const createdAt = req.params.createdAt;
  const user = `${client.platformOS} ${client.deviceId}`;

  if (!createdAt || !client.platformOS || !client.deviceId || /[^a-zA-Z0-9 \_\-]/.test(user)) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  try {
    let result = await mysqlQuery('DELETE FROM messages WHERE createdAt=? AND user=?', [createdAt, user]);
    if (result.affectedRows === 0) {
      sendErrorObject(res, 400, { Error: "Invalid input" });
      logger.error();
    }

    // broadcast it to everyone (including sender)
    io.emit('deleteMessage', { createdAt, user });

    res.status(200).send();
    logger.succeed();
  } catch (error) {
    console.log(error);
    sendErrorObject(res, 400, { Error: JSON.stringify(error) });
    logger.error(error);
  }
})

app.use(bodyParser.text());
http.listen(3000)
