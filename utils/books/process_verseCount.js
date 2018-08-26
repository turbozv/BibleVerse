var sqlite3 = require('sqlite3').verbose();
var fs = require('fs');

var db = new sqlite3.Database('rcuvss.sqlite3');

let books = {};
db.serialize(function () {
  db.each("SELECT * FROM books", function (err, row) {
    var book = row.number;
    var chapter = row.chapters;

    for (let i = 1; i <= chapter; i++) {
      db.each(`select ${book} as book, COUNT(*) AS verseCount, ${i} as chapter from verses inner join books on books.osis=verses.book where books.number=${book} and CAST(verse as integer)=${i}`, function (err, row) {

        if (err) {
          console.log(err);
          return;
        }

        if (!books[row.book]) {
          books[row.book] = [];
        }

        console.log(`${row.book}-${row.chapter}: ${row.verseCount}`);
        books[row.book][row.chapter] = row.verseCount;
        if (row.book === 66 && row.chapter === 22) {
          fs.writeFile("verseCount.json", JSON.stringify(books), function (err) {
            if (err) {
              return console.log(err);
            }
          });
        }
      });
    } // end for

  });
});
