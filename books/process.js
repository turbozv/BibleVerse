var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('rcuvss.sqlite3');
 
db.serialize(function() { 
  db.each("SELECT * FROM chapters", function(err, row) {
      var book = row.reference_human;
      var chapter = row.reference_osis.substring(row.reference_osis.indexOf(".") + 1);
      var content = row.content;

      // find `v0_1_` from `<span class="v0_1_1">` and remove it
      var removeIndexStart = content.indexOf('class="v');
      var removeIndexEnd = content.indexOf('">', removeIndexStart);
      var removeString = content.substring(removeIndexStart + 'class="v'.length, removeIndexEnd);
      var lastUnderline = removeString.lastIndexOf('_');
      removeString = removeString.substring(0, lastUnderline + 1);
      var re = new RegExp(removeString, "g");
      content = content.replace(re, '');      

      var fs = require('fs');
      fs.writeFile(book + chapter + ".json", JSON.stringify({"content": content}), function(err) {
        if (err) {
            return console.log(err);
        }
      });
  });
});
 
db.close();