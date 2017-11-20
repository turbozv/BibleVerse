var fetch = require('node-fetch');
var fs = require('fs');

let Languages = ['en-US', 'es-MX', 'zh-CN', 'zh-TW'];
const DayTitlePrefix = {
    "en-US": ['FIRST DAY: ', 'SECOND DAY: ', 'THIRD DAY: ', 'FOURTH DAY: ', 'FIFTH DAY: ', 'SIXTH DAY: '],
    "es-MX": ['PRIMER DÍA: ', 'SEGUNDO DÍA: ', 'TERCER DÍA: ', 'CUARTO DÍA: ', 'QUINTO DÍA: ', 'SEXTO DÍA: '],
    "zh-CN": ['第一天：', '第二天：', '第三天：', '第四天：', '第五天：', '第六天：'],
    "zh-TW": ['第一天：', '第二天：', '第三天：', '第四天：', '第五天：', '第六天：']
}

function getQuestionId(config, text) {
    const index = parseInt(text);
    if (index != config.questionId) {
        return index + "bcdefghijklmn"[config.questionSubId++];
    } else {
        config.questionSubId = 0;
        if (text.startsWith(index + '. a. ')) {
            return config.questionId++ + 'a';
        } else {
            return config.questionId++;
        }
    }
}

function getQuestions(config, data) {
    let result = [];
    for (var i in data) {
        const item = data[i];
        result.push({
            id: config.contentId + "_" + getQuestionId(config, item.questionText),
            questionText: item.questionText,
            answer: "",
            quotes: item.quotes
        });
    }

    return result;
}

function getDayTitlePrefix(config, index) {
    return DayTitlePrefix[config.currentLang][index];
}

function getReadVerse(data) {
    if (!data.readVerse || data.readVerse.length == 0) {
        return null;
    }

    return data.readVerse;
}

function getDayQuestion(config, data, index) {
    const item = data[index];
    let result = {};
    dayPrefix = getDayTitlePrefix(config, index);
    if (item.title.startsWith(dayPrefix)) {
        result.title = item.title;
    } else {
        result.title = dayPrefix + item.title;
    }
    const readVerse = getReadVerse(item);
    if (readVerse) {
        result.readVerse = readVerse;
    }
    result.questions = getQuestions(config, item.questions);
    return result;
}

function getDir(lang) {
    return ['eng', 'spa', 'chs', 'cht'][Languages.indexOf(lang)];
}

function saveFile(dir, file, content) {
    fs.mkdir(dir, () => {
        fs.writeFile(dir + '\\' + file, JSON.stringify(content), function (err) {
            console.log('Write to ' + dir + '\\' + file);
            if (err) {
                return console.log(err);
            }
        });
    });
}

function parse(content, currentLang) {
    for (var i in content) {
        const item = content[i];

        let config = {
            contentId: item.id,
            questionId: 1,
            questionSubId: 0,
            currentLang
        };

        newContent = {
            id: item.id,
            name: item.name + item.id,
            memoryVerse: item.memoryVerse,
            dayQuestions: {
                one: getDayQuestion(config, item.dayQuestions, 0),
                two: getDayQuestion(config, item.dayQuestions, 1),
                three: getDayQuestion(config, item.dayQuestions, 2),
                four: getDayQuestion(config, item.dayQuestions, 3),
                five: getDayQuestion(config, item.dayQuestions, 4),
                six: getDayQuestion(config, item.dayQuestions, 5),
            }
        };

        const dir = getDir(currentLang);
        saveFile(dir, item.id + ".json", newContent);
    }
}

async function fetchContent(lang) {
    const url = 'http://bsfapi.azurewebsites.net/material/' + lang + '/Lessons';
    console.log("Get: " + url);
    res = await fetch(url);
    json = await res.json();
    parse(json, lang);
}

for (var i in Languages) {
    fetchContent(Languages[i]);
}
