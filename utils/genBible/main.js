bibleList = ['niv2011',
  'cunpss',
  'cunpts',
  'rcuvss',
  'rcuvts',
  'esv',
  'rvr1995',
  'ccb',
  'cnvt',
  'kjv',
  'niv1984',
  'nvi'];

console.log(`ATTACH DATABASE 'bible.db' as bible;`);

for (var i in bibleList) {
  const book = bibleList[i];
  console.log(`ATTACH DATABASE '${book}.sqlite3' as ${book};`);
  console.log(`CREATE TABLE bible.[${book}](
    [id] INT PRIMARY KEY ASC NOT NULL UNIQUE, 
    [text] TEXT);`);
  console.log(`INSERT INTO bible.${book}(id, text) select (b.number * 1000* 1000 + v.verse*1000) as id, unformatted as text from ${book}.books as b inner join ${book}.verses as v on b.osis=v.book;`);
  console.log(`DETACH DATABASE ${book};`);
}