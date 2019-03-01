var fs = require('fs-sync');
var bookIds = require('./bookid.json');

let Languages = ['chs', 'cht', 'eng', 'spa'];

function getHomeJson(lang) {
  return fs.readJSON(`../../lessons/${lang}/home.json`);
}

function getLessonJson(lang, lesson) {
  return fs.readJSON(`../../lessons/${lang}/${lesson}.json`);
}

function getId(book, verse) {
  let bookId = -1;
  for (var i in bookIds) {
    if (bookIds[i].name == book) {
      bookId = bookIds[i].id;
      break;
    }
  }
  if (bookId === -1) {
    console.error(`Wrong book name ${book}`);
  }

  return bookId + (verse ? "/" + verse : '');
}

function addToCache(key, value) {
  globalCache[key] = value;
  console.log("Add #" + ++globalCacheSize + ": " + key);
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
      const lesson = getLessonJson(lang, lessonId);
      parseLesson(lesson, lang);
      addToCache('LESSON/' + lessonId + '?lang=' + lang, lesson);
    }
  }
}

// Main
if (!fs.isDir("data")) {
  fs.mkdir("data");
}

books = {};
for (i in Languages) {
  globalCache = {};
  globalCacheSize = 0;
  const lang = Languages[i];
  const home = getHomeJson(lang);
  books[lang] = home;

  addToCache('BOOK/?lang=' + lang, home);
  parseHome(home, lang);

  fs.write(`data\\${lang}.json`, JSON.stringify(globalCache));
}

fs.write(`data\\books.json`, JSON.stringify(books));
console.log('Done!');