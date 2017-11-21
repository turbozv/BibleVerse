var fs = require('fs');
var request = require('sync-request');
var bookIds = require('./bookid.json');
//var x = require('./cache.json');

var globalCache = {};
var globalCacheSize = 0;
let Languages = ['chs', 'cht', 'eng', 'spa'];
let BibleVerses = ['rcuvss', 'rcuvts', 'niv2011', 'nvi'];//['cunpss', 'cunpts', 'cnvt', 'esv', 'niv2011', 'kjv', 'rvr1995', 'nvi'];

function addToCache(key, value) {
  globalCache[key] = value;
  console.log("Add #" + ++globalCacheSize + ": " + key);
}

function getJson(url) {
  const res = request('GET', 'http://localhost:3000' + url);
  const body = res.getBody('utf-8');
  start = 0;
  while (body[start] != '{' && start < body.length) {
    start++;
  }

  return JSON.parse(body.substring(start));
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

    //for (k in BibleVerses) {
    k = Languages.indexOf(lang);
    const bibleVersion = BibleVerses[k];
    const bible = getJson('/verse/' + bookId + '?bibleVersion=' + bibleVersion + '&lang=' + lang);
    addToCache('PASSAGE/' + bookId + '?bibleVersion=' + bibleVersion + '&lang=' + lang, bible);
    //}
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

for (i in Languages) {
  globalCache = {};
  globalCacheSize = 0;
  const lang = Languages[i];
  const home = getJson('/lessons?lang=' + lang);

  addToCache('BOOK/?lang=' + lang, home);
  parseHome(home, lang);

  fs.writeFile(lang + '_cache.json', JSON.stringify(globalCache), function (err) {
    console.log('Write to ' + lang + '_cache.json...');
    if (err) {
      return console.log(err);
    }
  });
}
