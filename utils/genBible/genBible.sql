ATTACH DATABASE 'rcuvss.sqlite3' as rcuvss;
ATTACH DATABASE 'rcuvts.sqlite3' as rcuvts;
ATTACH DATABASE 'niv2011.sqlite3' as niv2011;
ATTACH DATABASE 'asv.sqlite3' as asv;
ATTACH DATABASE 'kjv.sqlite3' as kjv;
ATTACH DATABASE 'bible.db' as bible;
CREATE TABLE bible.[rcuvss](
    [id] INT PRIMARY KEY ASC NOT NULL UNIQUE, 
    [text] TEXT);
CREATE TABLE bible.[rcuvts](
    [id] INT PRIMARY KEY ASC NOT NULL UNIQUE, 
    [text] TEXT);
CREATE TABLE bible.[niv2011](
    [id] INT PRIMARY KEY ASC NOT NULL UNIQUE, 
    [text] TEXT);
CREATE TABLE bible.[asv](
    [id] INT PRIMARY KEY ASC NOT NULL UNIQUE, 
    [text] TEXT);
CREATE TABLE bible.[kjv](
    [id] INT PRIMARY KEY ASC NOT NULL UNIQUE, 
    [text] TEXT);
INSERT INTO bible.rcuvss(id, text) select (b.number * 1000* 1000 + v.verse*1000) as id, unformatted as text from rcuvss.books as b inner join rcuvss.verses as v on b.osis=v.book;
INSERT INTO bible.rcuvts(id, text) select (b.number * 1000* 1000 + v.verse*1000) as id, unformatted as text from rcuvts.books as b inner join rcuvts.verses as v on b.osis=v.book;
INSERT INTO bible.niv2011(id, text) select (b.number * 1000* 1000 + v.verse*1000) as id, unformatted as text from niv2011.books as b inner join niv2011.verses as v on b.osis=v.book;
INSERT INTO bible.asv(id, text) select (b.number * 1000* 1000 + v.verse*1000) as id, unformatted as text from asv.books as b inner join asv.verses as v on b.osis=v.book;
INSERT INTO bible.kjv(id, text) select (b.number * 1000* 1000 + v.verse*1000) as id, unformatted as text from kjv.books as b inner join kjv.verses as v on b.osis=v.book;