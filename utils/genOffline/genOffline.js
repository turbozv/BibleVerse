var fs = require('fs-sync');
var syncRequest = require('sync-request');
var request = require('request');
var bookIds = require('./bookid.json');

var globalCache = {};
var globalCacheSize = 0;
var globalBibleVerses = [];

let Languages = ['chs', 'cht', 'eng', 'spa'];
let BibleVerses = ['rcuvss', 'rcuvts', 'niv2011', 'nvi', 'ccb', 'cnvt', 'esv', 'niv1984', 'kjv', 'rvr1995'];

function addToCache(key, value) {
  globalCache[key] = value;
  console.log("Add #" + ++globalCacheSize + ": " + key);
}

function getCacheFile(url) {
  return 'cache\\' + url.replace(/\//g, '.').replace(/\?/g, '.').replace(/:/g, '.').replace(/=/g, '.')
}

function getCache(url) {
  const file = getCacheFile(url);
  if (fs.exists(file)) {
    return fs.read(file);
  }
  return null;
}

function writeCache(url, data) {
  const file = getCacheFile(url);
  fs.write(file, data);
}

function getJson(url, skipCache) {
  if (!skipCache) {
    let cache = getCache(url);
    if (cache) {
      return JSON.parse(cache);
    }
  }

  const res = syncRequest('GET', 'http://localhost:3000' + url);
  const body = res.getBody('utf-8');
  start = 0;
  while (body[start] != '{' && start < body.length) {
    start++;
  }

  const data = body.substring(start);
  if (!skipCache) {
    writeCache(url, data);
  }

  return JSON.parse(data);
}

function getId(book, verse) {
  let bookId = 1;
  for (var i in bookIds) {
    if (bookIds[i].name == book) {
      bookId = bookIds[i].id;
      break;
    }
  }
  return bookId + "/" + verse;
}

function parseDay(day, lang) {
  verses = [];
  if (day.readVerse) {
    verses = day.readVerse;
  }
  for (i in day.questions) {
    verses = verses.concat(day.questions[i].quotes);
  }

  for (i in verses) {
    const book = verses[i].book;
    const verse = verses[i].verse;
    const bookId = getId(book, verse);
    if (!globalBibleVerses[bookId]) {
      globalBibleVerses[bookId] = 1;
    }
  }
}

function parseLesson(lesson, lang) {
  parseDay(lesson.dayQuestions.one, lang);
  parseDay(lesson.dayQuestions.two, lang);
  parseDay(lesson.dayQuestions.three, lang);
  parseDay(lesson.dayQuestions.four, lang);
  parseDay(lesson.dayQuestions.five, lang);
  parseDay(lesson.dayQuestions.six, lang);
}

function parseHome(home, lang) {
  for (i in home.booklist) {
    const book = home.booklist[i];
    for (j in book.lessons) {
      const lessonId = book.lessons[j].id;
      const lesson = getJson('/lessons/' + lessonId + '?lang=' + lang);
      addToCache('LESSON/' + lessonId + '?lang=' + lang, lesson);
      parseLesson(lesson, lang);
    }
  }
}

function getVerses() {
  const total = Object.keys(globalBibleVerses).length;
  for (k in BibleVerses) {
    globalCache = {};
    globalCacheSize = 0;

    const bibleVersion = BibleVerses[k];
    let current = 0;
    for (verse in globalBibleVerses) {
      const bible = getJson('/verse/' + verse + '?bibleVersion=' + bibleVersion);
      addToCache('PASSAGE/' + verse + '?bibleVersion=' + bibleVersion, bible);
      console.log(`${parseInt(++current / total * 100)}%`);
    }

    console.log(`Write to ${bibleVersion}.json...`);
    fs.write(`data\\${bibleVersion}.json`, JSON.stringify(globalCache));
  }

  console.log("Done!");
}

// Main
if (!fs.isDir("cache")) {
  fs.mkdir("cache");
}
if (!fs.isDir("data")) {
  fs.mkdir("data");
}

for (i in Languages) {
  globalCache = {};
  globalCacheSize = 0;
  const lang = Languages[i];
  const home = getJson('/lessons?lang=' + lang, true);

  addToCache('BOOK/?lang=' + lang, home);
  parseHome(home, lang);

  fs.write(`data\\${lang}.json`, JSON.stringify(globalCache));
}

var total = Object.keys(globalBibleVerses).length * BibleVerses.length;
for (k in BibleVerses) {
  const bibleVersion = BibleVerses[k];
  let current = 0;
  for (verse in globalBibleVerses) {
    const url = '/verse/' + verse + '?bibleVersion=' + bibleVersion;
    if (!getCache(url)) {
      request('http://localhost:3000' + url, function (error, response, body) {
        writeCache(url, body);
        if (--total == 0) {
          getVerses();
        }
      });
    } else {
      if (--total == 0) {
        getVerses();
      }
    }
  }
}
