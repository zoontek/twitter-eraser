'use strict';

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

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

var getFilePath = function getFilePath(file) {
  return _path2.default.join(__dirname, file);
};

var requireFile = function requireFile(file) {
  return require(getFilePath(file));
};

var _requireFile = requireFile('package.json');

var appName = _requireFile.name;
var appDesc = _requireFile.description;
var appVersion = _requireFile.version;

var _requireFile2 = requireFile('config.json');

var consumer_key = _requireFile2.consumer_key;
var consumer_secret = _requireFile2.consumer_secret;
var access_token = _requireFile2.access_token;
var access_token_secret = _requireFile2.access_token_secret;
var timeout_ms = _requireFile2.timeout_ms;
var keeped_tweets = _requireFile2.keeped_tweets;
var concurrency = _requireFile2.concurrency;


console.log('🐦  ' + _chalk2.default.bold(appName) + ' ' + _chalk2.default.dim(appVersion));
console.log(_chalk2.default.italic(appDesc));

var twitterAPI = new _twit2.default({
  consumer_key: consumer_key,
  consumer_secret: consumer_secret,
  access_token: access_token,
  access_token_secret: access_token_secret,
  timeout_ms: timeout_ms
});

var csvConverter = new _csvtojson.Converter({
  checkType: false
});

var progressDb = (0, _lowdb2.default)(getFilePath('progress.json'), {
  storage: _fileSync2.default
});

progressDb.defaults({
  'deleted': []
}).value();

var deletedTweetsTable = progressDb.get('deleted');
var deletedTweets = [];

var isSuccess = function isSuccess(statusCode) {
  return statusCode >= 200 && statusCode < 300;
};

var isNotFound = function isNotFound(statusCode) {
  return statusCode === 404;
};

var logResponse = function logResponse(resp, tweetId) {
  if ((0, _lodash.isNil)(resp)) {
    return console.log(_chalk2.default.bold.red('No server response!'));
  }

  var statusCode = resp.statusCode;
  var request = resp.request;
  var href = request.href;


  if (isSuccess(statusCode)) {
    console.log(_chalk2.default.bold.green('success  ') + '  ' + href);
    deletedTweets.push(tweetId);
  } else if (isNotFound(statusCode)) {
    console.log(_chalk2.default.bold.yellow('not found') + '  ' + href);
    deletedTweets.push(tweetId);
  } else {
    console.log(_chalk2.default.bold.red('failure  ') + '  ' + href);
  }
};

csvConverter.fromFile(getFilePath('tweets.csv'), function (error, tweets) {
  if (error) {
    return console.warn(error);
  }

  var toDeleteTweetsIds = (0, _lodash.difference)((0, _lodash.drop)(tweets, keeped_tweets).map(function (t) {
    return t.tweet_id;
  }), deletedTweetsTable.value());

  console.log(_chalk2.default.bold(toDeleteTweetsIds.length + ' tweets to delete.'));

  _bluebird2.default.map(toDeleteTweetsIds, function (id) {
    return twitterAPI.post('statuses/destroy/' + id).then(function (_ref) {
      var resp = _ref.resp;
      return logResponse(resp, id);
    }).catch(function (error) {
      return console.warn(error);
    });
  }, { concurrency: concurrency }).then(function () {
    deletedTweetsTable.push.apply(deletedTweetsTable, deletedTweets).value();
    console.log(_chalk2.default.bold('Finished! Have a good day.'));
  });
});
