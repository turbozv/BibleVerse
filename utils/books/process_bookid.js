var books = []

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('rcuvss.sqlite3');
db.serialize(function () {
  db.each("SELECT * FROM books", function (err, row) {
    books.push({ name: row.human, id: row.number })
  }, function () {

    db = new sqlite3.Database('rcuvts.sqlite3');
    db.serialize(function () {
      db.each("SELECT * FROM books", function (err, row) {
        books.push({ name: row.human, id: row.number })
      }, function () {

        db = new sqlite3.Database('niv2011.sqlite3');
        db.serialize(function () {
          db.each("SELECT * FROM books", function (err, row) {
            books.push({ name: row.human, id: row.number })
          }, function () {
            
            db = new sqlite3.Database('rvr1995.sqlite3');
            db.serialize(function () {
              db.each("SELECT * FROM books", function (err, row) {
                books.push({ name: row.human, id: row.number })
              }, function () {
                console.log(JSON.stringify(books));

                var fs = require('fs');
                fs.writeFile("bookid.json", JSON.stringify(books), function (err) {
                  if (err) {
                    return console.log(err);
                  }
                });
              });
            });

          });
        });

      });
    });
  });
});

db.close();