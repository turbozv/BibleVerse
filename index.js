let sqlite3 = require('sqlite3');
let fs = require('fs');
let bodyParser = require('body-parser');
let config = require('./config.js');
let mysql = require('mysql');
let util = require('util');
let app = require('express')();
let http = require('http').Server(app);
let io = require('socket.io')(http);
const nodemailer = require('nodemailer');
const uuid = require('uuid');

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
      ip: getIp(this.req),
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

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function isNullOrUndefined(value) {
  return value === null || value === undefined;
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

function getIp(req) {
  let ip = req.headers['x-forwarded-for'];
  if (!ip) {
    ip = req.ip.replace('::ffff:', '');
  }
  return ip;
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

  return { deviceId, sessionId, language, ip: getIp(req), platformOS, deviceYearClass, cellphone, bibleVersion, version };
}

function getVerseRange(verse) {
  if (isNullOrUndefined(verse)) {
    return null;
  }

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
app.get('/verse/:query', function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const query = req.params.query;
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
app.get('/lessons/:lessonId', function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const id = req.params.lessonId;
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

// Get attendance summary '/cellphone/{lesson}'
app.get('/attendanceSummary/:cellphone/:lesson?', async function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const cellphone = req.params.cellphone;
  const lesson = req.params.lesson;
  if (isNullOrUndefined(cellphone) || cellphone.length === 0 ||
    (lesson && parseInt(lesson) < 0 || parseInt(lesson) >= 30)) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  try {
    // Find out the leader's information
    var result = await mysqlQuery('SELECT id, CONCAT(cname, " ", name) as name, class FROM users WHERE cellphone=? ORDER BY class DESC, role ASC, registerDate DESC LIMIT 1', [cellphone]);
    if (result.length === 0) {
      sendErrorObject(res, 401, { Error: "No such user" });
      logger.error("No such user");
      return;
    }
    const user = result[0];

    // Get group names
    let groupNames = [];
    result = await mysqlQuery('SELECT groupId, name FROM groups WHERE class=?', [user.class]);
    if (result.length > 0) {
      result.map(item => groupNames[item.groupId] = item.name);
    }

    // Get substitute leader info for specified lesson
    let substitutes = {};
    if (lesson) {
      result = await mysqlQuery('SELECT users.id, attendLeaders.`group`, CONCAT(cname, " ", name) as name FROM attendLeaders' +
        ' INNER JOIN users ON users.id=attendLeaders.leader WHERE attendLeaders.lesson=?', [lesson]);
      result.map(item => substitutes[item.group] = { id: item.id, name: item.name });
    }

    // Get groups info
    var result = await mysqlQuery('SELECT `group`, lesson FROM attendLeaders WHERE leader=?', [user.id]);
    if (result.length === 0) {
      sendErrorObject(res, 401, { Error: "No permission" });
      logger.error("No permission");
      return;
    }

    let response = { user: user.id, groups: [], attendance: [], substitute: [] };

    // Populate groups with names
    for (let i in result) {
      const group = result[i].group;
      const leaderLesson = result[i].lesson;

      // Get attendees count
      let userResult;
      if (group === 0 || group === 1000) {
        // Co-worker group includes all GL (which is not in group#0)
        userResult = await mysqlQuery('SELECT COUNT(*) AS count FROM users WHERE class=? AND ((`group`=0 AND role!=255) OR (`group`!=0 AND role=6)) ORDER BY role, name ASC', [user.class]);
      } else {
        userResult = await mysqlQuery('SELECT COUNT(*) AS count FROM users WHERE class=? AND `group`=? ORDER BY role, name ASC', [user.class, group]);
      }
      const totalCount = userResult[0].count;

      // Get attendance data
      let attendanceResult;
      if (leaderLesson === 0) {
        attendanceResult = await mysqlQuery('SELECT lesson, users FROM attend WHERE class=? AND `group`=?', [user.class, group]);
      } else {
        attendanceResult = await mysqlQuery('SELECT lesson, users FROM attend WHERE class=? AND `group`=? AND lesson=?', [user.class, group, leaderLesson]);
      }

      attendanceResult.map(item => {
        const checkedInUsers = JSON.parse(item.users);
        response.attendance.push({
          lesson: item.lesson,
          group: group,
          rate: parseInt(checkedInUsers.length * 10000 / totalCount) / 100,
        });
      });

      const groupData = {
        id: group,
        lesson: leaderLesson,
        name: groupNames[group] ? groupNames[group] : '',
      };
      if (group === 0 || group === 1000) {
        // Co-worker group needs to show first
        response.groups.unshift(groupData);
      } else {
        response.groups.push(groupData);
      }

      if (substitutes[group]) {
        response.substitute.push({
          group: group,
          ...substitutes[group]
        });
      }
    }

    sendResultObject(res, response);
    logger.succeed();
  } catch (error) {
    console.log(error);
    sendErrorObject(res, 400, { Error: JSON.stringify(error) });
    logger.error(error);
  }
});

// Get attendance details '/cellphone/group/lesson'
app.get('/attendance/:cellphone/:group/:lesson', async function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const cellphone = req.params.cellphone;
  const group = parseInt(req.params.group);
  const lesson = parseInt(req.params.lesson);
  if (isNullOrUndefined(cellphone) || cellphone.length === 0 || lesson < 0 || lesson >= 30) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  try {
    // Find out the leader's information
    var result = await mysqlQuery('SELECT id, CONCAT(cname, " ", name) as name, class FROM users WHERE cellphone=? ORDER BY class DESC, role ASC, registerDate DESC LIMIT 1', [cellphone]);
    if (result.length === 0) {
      sendErrorObject(res, 401, { Error: "No such user" });
      logger.error("No such user");
      return;
    }
    const user = result[0];

    // Verify group exists
    result = await mysqlQuery('SELECT `group` FROM attendLeaders WHERE leader=? AND `group`=?', [user.id, group]);
    if (result.length === 0) {
      sendErrorObject(res, 401, { Error: "No permission" });
      logger.error("No permission");
      return;
    }

    // Get substitute leader info for specified lesson
    let substitute = {};
    if (lesson) {
      result = await mysqlQuery('SELECT users.id, attendLeaders.`group`, CONCAT(cname, " ", name) as name FROM attendLeaders' +
        ' INNER JOIN users ON users.id=attendLeaders.leader WHERE attendLeaders.lesson=? AND attendLeaders.group=?', [lesson, group]);
      if (result.length > 0) {
        substitute = { id: result[0].id, name: result[0].name };
      }
    }

    // Get attendees
    if (group === 1000) {
      // Co-worker group includes all GL (which is not in group#0)
      result = await mysqlQuery('SELECT id, CONCAT(cname, " ", name) as name, cellphone FROM users WHERE class=? AND ((`group`=0 AND role!=255) OR (`group` != 0 AND role=6)) ORDER BY role, name ASC', [user.class]);
    } else if (group === 0) {
      // Co-worker group excludes GL
      result = await mysqlQuery('SELECT id, CONCAT(cname, " ", name) as name, cellphone FROM users WHERE class=? AND `group`=0 AND role!=255 AND role!=6 ORDER BY role, name ASC', [user.class]);
    } else {
      result = await mysqlQuery('SELECT id, CONCAT(cname, " ", name) as name, cellphone FROM users WHERE class=? AND `group`=? ORDER BY role, name ASC', [user.class, group]);
    }

    let response = result.map(item => { return { id: item.id, name: item.name, cellphone: item.cellphone }; });
    result = await mysqlQuery('SELECT users FROM attend WHERE `group`=? AND class=? AND lesson=? ORDER BY submitDate DESC LIMIT 1', [group, user.class, lesson]);
    if (result.length > 0) {
      let checkedInUsers = JSON.parse(result[0].users);
      for (let i in response) {
        if (checkedInUsers.includes(response[i].id)) {
          response[i].checked = true;
        }
      }
    }

    sendResultObject(res, { users: response, substitute });
    logger.succeed();

  } catch (error) {
    console.log(error);
    sendErrorObject(res, 400, { Error: JSON.stringify(error) });
    logger.error(error);
  }
});

// Post attendance
app.post('/attendance/:cellphone', jsonParser, async function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const cellphone = req.params.cellphone;
  if (isNullOrUndefined(cellphone) || cellphone.length === 0 || isNullOrUndefined(req.body) ||
    isNullOrUndefined(req.body.lesson) || isNullOrUndefined(req.body.users) ||
    isNullOrUndefined(client.cellphone) || isNullOrUndefined(req.body.group)) {
    sendErrorObject(res, 401, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  try {
    // Find out the leader's information
    var result = await mysqlQuery('SELECT id, CONCAT(cname, " ", name) as name, class FROM users WHERE cellphone=? ORDER BY class DESC, role ASC, registerDate DESC LIMIT 1', [cellphone]);
    if (result.length === 0) {
      sendErrorObject(res, 401, { Error: "No such user" });
      logger.error("No such user");
      return;
    }
    const user = result[0];

    // Verify group exists
    result = await mysqlQuery('SELECT `group` FROM attendLeaders WHERE leader=? AND `group`=?', [user.id, req.body.group]);
    if (result.length === 0) {
      sendErrorObject(res, 401, { Error: "No permission" });
      logger.error("No permission");
      return;
    }

    // Add to database
    const data = {
      lesson: req.body.lesson,
      leader: user.id,
      group: req.body.group,
      users: JSON.stringify(req.body.users),
    };

    await mysqlQuery('REPLACE INTO attend SET ?', data);

    res.status(201).send();
    logger.succeed();
  } catch (error) {
    console.log(error);
    sendErrorObject(res, 400, { Error: JSON.stringify(error) });
    logger.error(error);
  }
})

// Get leaders info '/cellphone/group/lesson'
app.get('/leaders/:cellphone/:group/:lesson', async function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const cellphone = req.params.cellphone;
  const group = parseInt(req.params.group);
  const lesson = parseInt(req.params.lesson);
  if (isNullOrUndefined(cellphone) || cellphone.length === 0 || lesson <= 0 || lesson >= 30) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  try {
    // Verify leader and get all leaders
    var result = await mysqlQuery('SELECT id, CONCAT(cname, " ", name) as name FROM users WHERE class=(SELECT class FROM users WHERE cellphone=? ORDER BY class DESC, role ASC, registerDate DESC LIMIT 1) AND role!=255', [cellphone]);
    if (result.length === 0) {
      sendErrorObject(res, 401, { Error: "No such user" });
      logger.error("No such user");
      return;
    }

    // Get the current delegate leader
    var delegateLeaderResult = await mysqlQuery('SELECT users.id FROM attendLeaders INNER JOIN users ON users.id=attendLeaders.leader WHERE attendLeaders.`group`=? AND attendLeaders.lesson=?', [group, lesson]);
    if (delegateLeaderResult.length > 0) {
      for (let i in result) {
        if (result[i].id === delegateLeaderResult[0].id) {
          result[i].current = true;
          break;
        }
      }
    }

    sendResultObject(res, result);
    logger.succeed();

  } catch (error) {
    console.log(error);
    sendErrorObject(res, 400, { Error: JSON.stringify(error) });
    logger.error(error);
  }
});

// Transfer leader
app.post('/transferLeader/:cellphone', jsonParser, async function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const cellphone = req.params.cellphone;
  if (isNullOrUndefined(cellphone) || cellphone.length === 0 || isNullOrUndefined(req.body) ||
    isNullOrUndefined(req.body.lesson) || req.body.lesson <= 0 || req.body.lesson >= 30 ||
    isNullOrUndefined(req.body.group) || isNullOrUndefined(req.body.leader)) {
    sendErrorObject(res, 401, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  try {
    // Verify leader and get the transfering leader
    var result = await mysqlQuery('SELECT id, cellphone FROM users WHERE class=(SELECT class FROM users WHERE cellphone=? ORDER BY class DESC, role ASC, registerDate DESC LIMIT 1) AND role!=255 AND id=?', [cellphone, req.body.leader]);
    if (result.length === 0) {
      sendErrorObject(res, 401, { Error: "No such user" });
      logger.error("No such user");
      return;
    }

    // Remove existing delegate leader
    await mysqlQuery('DELETE FROM attendLeaders WHERE lesson=? AND `group`=?', [req.body.lesson, req.body.group]);

    if (result[0].cellphone !== cellphone) {
      // Add to database if it's not self
      const data = {
        group: req.body.group,
        lesson: req.body.lesson,
        leader: req.body.leader
      };
      await mysqlQuery('INSERT INTO attendLeaders SET ?', data);
    }

    res.status(201).send();
    logger.succeed();
  } catch (error) {
    console.log(error);
    sendErrorObject(res, 400, { Error: JSON.stringify(error) });
    logger.error(error);
  }
})

// Get teaching audio
app.get('/audio/:cellphone', function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const cellphone = req.params.cellphone;
  if (isNullOrUndefined(cellphone) || cellphone.length === 0) {
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

// get download file
app.get('/download/:token', async function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const token = req.params.token;
  if (isNullOrUndefined(token) || token.length === 0) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  try {
    let result = await mysqlQuery('SELECT file FROM downloads WHERE token=?', [token]);
    if (result.length === 0) {
      sendErrorObject(res, 400, { Error: "Invalid input" });
      logger.error("Invalid input");
      return;
    }

    const file = result[0].file;
    res.download(file);
    logger.succeed();
  } catch (error) {
    console.log(error);
    sendErrorObject(res, 400, { Error: JSON.stringify(error) });
    logger.error(error);
  }
});

// generate download token
app.get('/downloadToken/:cellphone/:lesson/:item', async function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const cellphone = req.params.cellphone;
  const lesson = req.params.lesson;
  const item = req.params.item;
  if (isNullOrUndefined(cellphone) || cellphone.length === 0 ||
    isNullOrUndefined(lesson) || lesson.length === 0 ||
    isNullOrUndefined(item) || item.length === 0) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  try {
    let result = await mysqlQuery('SELECT audio FROM users WHERE cellphone=? LIMIT 1', [cellphone]);
    if (result.length === 0 || !result[0].audio) {
      sendErrorObject(res, 400, { Error: "Invalid input" });
      logger.error("Invalid input");
      return;
    }

    result = await mysqlQuery('SELECT lesson, notes, seminar FROM audios WHERE lesson=?', [lesson]);
    if (result.length === 0) {
      sendErrorObject(res, 400, { Error: "Invalid input" });
      logger.error("Invalid input");
      return;
    }

    let audio;
    switch (item) {
      case '1':
        audio = result[0].notes;
        break;
      case '2':
        audio = result[0].seminar;
        break;
      default:
        audio = result[0].lesson;
        break;
    }
    if (audio.length === 0) {
      sendErrorObject(res, 400, { Error: "Invalid input" });
      logger.error("Invalid input");
      return;
    }
    const token = uuid.v4();
    const data = {
      token: token,
      cellphone: cellphone,
      file: `audios/${audio}.mp3`
    };

    result = await mysqlQuery('REPLACE INTO downloads SET ?', data);
    sendResultObject(res, { token });
    logger.succeed();
  } catch (error) {
    console.log(error);
    sendErrorObject(res, 400, { Error: JSON.stringify(error) });
    logger.error(error);
  }
});

// Get teaching audio info
app.get('/audioInfo/:lesson?', async function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const cellphone = client.cellphone;
  if (!cellphone) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  const lesson = req.params.lesson;
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
app.get('/user/:cellphone/:lastCheckTime?', async function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const cellphone = req.params.cellphone.trim();
  if (cellphone.length === 0) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }
  const lastCheckTime = req.params.lastCheckTime ? parseInt(req.params.lastCheckTime) : 0;

  try {
    const lessonsData = fs.readFileSync('LessonData.json', { encoding: 'utf-8' });
    const lessons = JSON.parse(lessonsData);

    const appManifestData = fs.readFileSync('cbsf.manifest.json', { encoding: 'utf-8' });
    const appManifest = JSON.parse(appManifestData);

    let result = await mysqlQuery('SELECT id, name, audio, class, role FROM users WHERE cellphone=? ORDER BY class DESC, role ASC, registerDate DESC LIMIT 1', [cellphone]);
    if (result.length === 0) {
      const nonRegisteredUserData = {
        lessons: lessons,
        app: {
          sdkVersion: appManifest.sdkVersion,
          publishedTime: appManifest.publishedTime
        }
      };
      sendResultObject(res, nonRegisteredUserData);
      logger.succeed();
      return;
    }
    const user = result[0];

    result = await mysqlQuery('SELECT lesson FROM audios');
    let audios = [];
    result.map(item => audios.push(item.lesson));

    let discussions = {};
    const checkTime = new Date().getTime();
    result = await mysqlQuery('SELECT room, MAX(createdAt) as createdAt FROM DiscussionRooms WHERE createdAt>? AND createdAt<=? GROUP BY room', [lastCheckTime, checkTime]);
    result.map(item => discussions[item.room] = item.createdAt);

    const data = {
      audio: user.audio,
      class: user.class,
      isGroupLeader: (user.role !== 255),
      chat: 1,
      checkTime: checkTime,
      discussions: discussions,
      audios: audios,
      lessons: lessons,
      app: {
        sdkVersion: appManifest.sdkVersion,
        publishedTime: appManifest.publishedTime
      }
    };
    sendResultObject(res, data);
    logger.succeed();

  } catch (error) {
    console.log(error);
    sendErrorObject(res, 400, { Error: JSON.stringify(error) });
    logger.error(error);
  }
})

// Reset password by sending a token
app.get('/resetPassword/:email', async function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const email = req.params.email;

  if (!email || email.length === 0) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  let token = '';
  for (let i = 0; i < 8; i++) {
    token += getRandomInt(10).toString();
  }

  try {
    const result = await mysqlQuery('UPDATE registerdusers SET resetToken=?, resetTokenTime=NOW() WHERE email=?', [token, email]);
    if (result.affectedRows !== 1) {
      sendErrorObject(res, 400, { Error: "Invalid user" });
      logger.succeed();
      return;
    }

    const transporter = nodemailer.createTransport({ host: config.mail.host, port: 465, secure: true, auth: { user: config.mail.user, pass: config.mail.pass } });
    const mailOptions = {
      from: config.mail.sender,
      to: email,
      subject: `CBSF password reset`,
      text: `Your temporary CBSF password is ${token}, it's valid for 1 hour, please login in CBSF app and update your password. (This is an automatically generated email – please do not reply to it. If you have any questions, please send feedback in CBSF app)`,
      html: `Your temporary CBSF password is <b><font color='red'>${token}</font></b>, it's valid for 1 hour, please login in CBSF app and change your password. (This is an automatically generated email – please do not reply to it. If you have any questions, please send feedback in CBSF app)`
    };
    transporter.sendMail(mailOptions).then(info => {
      console.log("Message sent: %s", info.messageId);
    });

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
    ip: getIp(req),
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

// Post poke (device call home)
app.post('/poke', jsonParser, function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  res.status(201).send();
  let data = getRequestValue(req, 'data') + (req.body.data ? req.body.data : '');
  logger.done(data);
})

// Report reportError
app.get('/reportError/:deviceId', jsonParser, function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  res.status(200).send();
  logger.done(req.params.deviceId);
})

// Get messages for chat/discussion
app.get('/messages/:room', function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const room = req.params.room;
  if (isNullOrUndefined(room) || room.length === 0) {
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
  let ip = socket.handshake.headers['x-forwarded-for'];
  if (!ip) {
    ip = socket.handshake.address.replace('::ffff:', '');
  }

  console.log(`user connected [${ip}]`);

  socket.on('disconnect', function () {
    console.log(`user disconnected [${ip}]`);
  });

  // listen on new message and broadcast it
  socket.on('newMessage', function (data) {
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
            subject: `New feedback from CBSF user[${data.user}]`,
            text: `${data.message}\n\nIP: ${ip}\n\nPlease go to https://mycbsf.org to reply`,
            html: `${data.message}<br><br>IP: ${ip}<br><br>Please go to <a href='https://mycbsf.org'>https://mycbsf.org</a> to reply`
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
