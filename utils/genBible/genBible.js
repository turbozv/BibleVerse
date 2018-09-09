var fs = require('fs-sync');
var sqlite3 = require('sqlite3').verbose();
var lzs = require('lz-string');

const books = ['ccb.sqlite3',
  'cnvt.sqlite3',
  'cunpss.sqlite3',
  'cunpts.sqlite3',
  'esv.sqlite3',
  'kjv.sqlite3',
  'niv1984.sqlite3',
  'niv2011.sqlite3',
  'nvi.sqlite3',
  'rvr1995.sqlite3'];

books.forEach(book => {
  console.log(book);
  var db = new sqlite3.Database(book);
  var result = {};
  let count = 0;
  db.serialize(() => {
    db.each("select (books.number*1000000+ verses.verse*1000) as id, verses.unformatted as text from verses inner join books on books.osis=verses.book", (err, row) => {
      result[row.id] = row.text.replace(/\n/g, '').trim();
      count++;
    }, () => {
      book = book.replace('.sqlite3', '');
      console.log(`Write to ${book}.json[${count}]`);
      fs.write(`${book}.json`, JSON.stringify(result));
      fs.write(`${book}.lz`, lzs.compress(JSON.stringify(result)));
    });
  });
});