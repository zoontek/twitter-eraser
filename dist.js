'use strict';

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _twit = require('twit');

var _twit2 = _interopRequireDefault(_twit);

var _lodash = require('lodash');

var _csvtojson = require('csvtojson');

var _fileSync = require('lowdb/lib/file-sync');

var _fileSync2 = _interopRequireDefault(_fileSync);

var _lowdb = require('lowdb');

var _lowdb2 = _interopRequireDefault(_lowdb);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var parseRootJsonFile = function parseRootJsonFile(file) {
  return JSON.parse(_fs2.default.readFileSync(_path2.default.join(__dirname, file + '.json')));
};

var _parseRootJsonFile = parseRootJsonFile('package');

var appName = _parseRootJsonFile.name;
var appDesc = _parseRootJsonFile.description;
var appVersion = _parseRootJsonFile.version;

var _parseRootJsonFile2 = parseRootJsonFile('config');

var consumer_key = _parseRootJsonFile2.consumer_key;
var consumer_secret = _parseRootJsonFile2.consumer_secret;
var access_token = _parseRootJsonFile2.access_token;
var access_token_secret = _parseRootJsonFile2.access_token_secret;
var timeout_ms = _parseRootJsonFile2.timeout_ms;
var keeped_tweets = _parseRootJsonFile2.keeped_tweets;
var concurrency = _parseRootJsonFile2.concurrency;


console.log('🐦  ' + _chalk2.default.bold(appName) + ' ' + _chalk2.default.dim(appVersion));
console.log(_chalk2.default.italic(appDesc));

var twitterAPI = new _twit2.default({
  consumer_key: consumer_key,
  consumer_secret: consumer_secret,
  access_token: access_token,
  access_token_secret: access_token_secret,
  timeout_ms: timeout_ms
});

var csvConverter = new _csvtojson.Converter({ checkType: false });
var progressDb = (0, _lowdb2.default)(_path2.default.join(__dirname, 'progress.json'), { storage: _fileSync2.default });
progressDb.defaults({ 'deleted': [] }).value();
var deletedTweetsTable = progressDb.get('deleted');
var deletedTweets = [];

csvConverter.fromFile(_path2.default.join(__dirname, 'tweets.csv'), function (error, tweets) {
  if (error) {
    return console.warn(error);
  }

  var tweetsToDelete = (0, _lodash.drop)(tweets, keeped_tweets).map(function (t) {
    return t.tweet_id;
  });
  var allTweetsMinusDeleted = (0, _lodash.difference)(tweetsToDelete, deletedTweetsTable.value());

  console.log(_chalk2.default.bold(allTweetsMinusDeleted.length + ' tweets to delete.'));

  _bluebird2.default.map(allTweetsMinusDeleted, function (id) {
    return twitterAPI.post('statuses/destroy/' + id).then(function (_ref) {
      var resp = _ref.resp;

      if ((0, _lodash.isNil)(resp)) {
        return console.log(_chalk2.default.bold.red('No server response!'));
      }

      var statusCode = resp.statusCode;
      var request = resp.request;


      if (statusCode >= 200 && statusCode < 300) {
        console.log(_chalk2.default.bold.green('success  ') + '  ' + request.href);
        deletedTweets.push(id);
      } else if (statusCode === 404) {
        console.log(_chalk2.default.bold.yellow('not found') + '  ' + request.href);
        deletedTweets.push(id);
      } else {
        console.log(_chalk2.default.bold.red('failure  ') + '  ' + request.href);
      }
    }).catch(function (error) {
      return console.warn(error);
    });
  }, { concurrency: concurrency }).then(function () {
    deletedTweetsTable.push.apply(deletedTweetsTable, deletedTweets).value();
    console.log(_chalk2.default.bold('Finished! Have a good day.'));
  });
});
