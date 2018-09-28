var fs = require('fs');
var sqlite3 = require('sqlite3').verbose();
//var lzs = require('lz-string');

if (!fs.existsSync('data')) {
  fs.mkdirSync('data');
}

fs.readdirSync('books').forEach(file => {
  if (!file.endsWith('.sqlite3')) {
    return;
  }
  console.log(file);
  var db = new sqlite3.Database(`books\\${file}`);
  var result = {};
  let count = 0;
  db.serialize(() => {
    db.each("select (books.number*1000000+ verses.verse*1000) as id, verses.unformatted as text from verses inner join books on books.osis=verses.book", (err, row) => {
      result[row.id] = row.text.trim();
      count++;
    }, () => {
      file = file.replace('.sqlite3', '');
      console.log(`Write to ${file}.json[${count}]`);
      fs.writeFileSync(`data\\${file}.json`, JSON.stringify(result));
      //fs.write(`data\\${file}.lz`, lzs.compress(JSON.stringify(result)));
    });
  });
});