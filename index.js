let sqlite3 = require('sqlite3');
let fs = require('fs');
let bodyParser = require('body-parser');
let https = require('https');
let config = require('./config.js');
let mysql = require('mysql');
const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

let dbBible = new sqlite3.Database('bible.db');
let jsonParser = bodyParser.json()
let mysqlConn = mysql.createConnection({ host: config.mysqlServer, user: config.mysqlUser, password: config.mysqlPassword, database: config.mysqlDatabase, timezone: 'pst', charset: 'utf8mb4' });

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

// Get attendance
app.get('/attendance', function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  if (!client.cellphone) {
    sendErrorObject(res, 401, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  // Find out the leader's information and groups
  mysqlConn.query({
    sql: 'SELECT id, `group`, CONCAT(cname, " ", name) as name, cellphone, class FROM users WHERE `group` IN (SELECT attendanceLeaders.`group` FROM users INNER JOIN attendanceLeaders ON attendanceLeaders.leader=users.id WHERE users.cellphone=?) AND class=2',
    values: [client.cellphone]
  }, function (error, result, fields) {
    if (error) {
      sendErrorObject(res, 400, { Error: JSON.stringify(error) });
      logger.error(error);
    } else if (result.length === 0) {
      sendErrorObject(res, 401, { Error: "No permission" });
      logger.error(error);
    } else {
      const classId = result[0].class;
      let attendees = result;
      // Find the current attendance date
      mysqlConn.query({
        sql: 'SELECT date AS nextClassDate FROM attendanceDates WHERE class=? AND date <= DATE(NOW()) ORDER BY date DESC LIMIT 1',
        values: [classId]
      }, function (error, result, fields) {
        if (error) {
          sendErrorObject(res, 400, { Error: JSON.stringify(error) });
          logger.error(error);
        } else if (result.length === 0) {
          sendErrorObject(res, 400, { Error: "No class date set, please check with Admin" });
          logger.error(error);
        } else {
          const nextClassDate = getYYYYMMDD(result[0].nextClassDate);
          // Get users from all groups
          mysqlConn.query({
            sql: 'SELECT `group`, users FROM attendance WHERE date=? AND `group` IN (SELECT attendanceLeaders.`group` FROM attendanceLeaders INNER JOIN users ON attendanceLeaders.leader=users.id WHERE users.cellphone=?) ORDER BY submitDate DESC',
            values: [nextClassDate, client.cellphone]
          }, function (error, result, fields) {
            if (error) {
              sendErrorObject(res, 400, { Error: JSON.stringify(error) });
              logger.error(error);
            } else {
              let checkedInUsers = [];
              for (let i in result) {
                const group = result[i].group;
                if (!checkedInUsers[group]) {
                  checkedInUsers[group] = JSON.parse(result[i].users);
                }
              }

              for (let i in attendees) {
                delete attendees[i].class;
                const group = attendees[i].group;
                if (checkedInUsers[group] && checkedInUsers[group].includes(attendees[i].id)) {
                  attendees[i].checked = true;
                }
              }

              sendResultObject(res, { date: nextClassDate, attendees });
              logger.succeed();
            }
          });
        }
      });
    }
  });
})

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
      sql: 'SELECT audios.lesson, audios.notes FROM users INNER JOIN audios WHERE cellphone=? AND lesson=? AND audio=1',
      values: [cellphone, lesson]
    };
  } else {
    query = {
      sql: 'SELECT audios.lesson, audios.notes FROM users INNER JOIN audios WHERE cellphone=? AND audio=1 ORDER BY lesson DESC LIMIT 1',
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

// Get user information
app.get('/user/*', function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  const cellphone = req.params[0];
  if (!cellphone) {
    sendErrorObject(res, 400, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  mysqlConn.query({
    sql: 'SELECT lesson FROM audios WHERE class=1'
  }, function (error, result, fields) {
    if (error) {
      sendErrorObject(res, 400, { Error: JSON.stringify(error) });
      logger.error(error);
    }
    audios = [];
    for (let i in result) {
      audios.push(result[i].lesson);
    }
    mysqlConn.query({
      sql: 'SELECT * FROM users WHERE cellphone=? ORDER BY class DESC, role ASC, registerDate DESC LIMIT 1',
      values: [cellphone]
    }, function (error, result, fields) {
      if (error) {
        sendErrorObject(res, 400, { Error: JSON.stringify(error) });
        logger.error(error);
      } else if (result.length === 0) {
        sendErrorObject(res, 400, { Error: "Invalid user" });
        logger.error(error);
      } else {
        const data = {
          name: result[0].name,
          audio: result[0].audio,
          class: result[0].class,
          isGroupLeader: ([0, 1, 2, 3, 4, 6, 7, 9, 10, 11].indexOf(result[0].role) !== -1),
          chat: 1
        };
        if (data.audio) {
          data.audios = audios;
        }
        sendResultObject(res, data);
        logger.succeed();
      }
    });
  });
})

// Post attendance
app.post('/attendance', jsonParser, function (req, res) {
  const client = getClientInfo(req);
  let logger = new Logger(req, client);
  if (!req.body || !req.body.date || !req.body.users || !client.cellphone) {
    sendErrorObject(res, 401, { Error: "Invalid input" });
    logger.error("Invalid input");
    return;
  }

  // leader may have multiple groups, we will add attendance row for each group
  mysqlConn.query({
    sql: 'SELECT attendanceLeaders.leader, attendanceLeaders.`group`, users.class FROM users INNER JOIN attendanceLeaders ON attendanceLeaders.leader=users.id WHERE users.cellphone=? ORDER BY users.registerDate DESC',
    values: [client.cellphone]
  }, function (error, result, fields) {
    if (error) {
      sendErrorObject(res, 400, { Error: JSON.stringify(error) });
      logger.error(error);
    } else if (result.length === 0) {
      sendErrorObject(res, 400, { Error: "No permission" });
      logger.error(error);
    } else {
      const leaderId = result[0].leader;
      const classId = result[0].class;
      // submit for each group
      let groupCount = result.length;
      for (let i in result) {
        const groupId = result[i].group;
        mysqlConn.query({
          sql: 'SELECT (SELECT GROUP_CONCAT(id) from users where `group`=? AND class=?) AS groupUsers, (SELECT COUNT(*) FROM users WHERE `group`=? AND class=?) AS groupUserCount',
          values: [groupId, classId, groupId, classId]
        }, function (error, result, fields) {
          if (error) {
            sendErrorObject(res, 400, { Error: JSON.stringify(error) });
            logger.error(error);
          } else if (result.length === 0) {
            sendErrorObject(res, 400, { Error: "No permission" });
            logger.error(error);
          } else {
            // if the leader submit for multi-group users, we only write the users belong to the current group
            let users = [];
            let groupUsers = result[0].groupUsers.split(',');
            for (let i in groupUsers) {
              let userId = parseInt(groupUsers[i]);
              if (req.body.users.indexOf(userId) !== -1) {
                users.push(userId);
              }
            }
            let data = {
              date: req.body.date,
              leader: leaderId,
              group: groupId,
              users: JSON.stringify(users),
              totalUsers: result[0].groupUserCount
            };
            mysqlConn.query('INSERT INTO attendance SET ?', data, function (error, results, fields) {
              groupCount--;
              if (error) {
                sendResultObject(res, { Error: error });
                logger.error(error);
              } else {
                if (groupCount === 0) {
                  res.status(201).send();
                  logger.succeed();
                }
              }
            });
          }
        });
      }
    }
  });
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
io.sockets.on('connection', function (socket) {
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
        // broadcast it to everyone
        socket.broadcast.emit('newMessage', {
          createdAt,
          room: data.room,
          user: data.user,
          message: data.message
        });
      }
    });
  });
});

app.use(bodyParser.text());
server.listen(3000)
