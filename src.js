import Promise from 'bluebird'
import path from 'path'
import chalk from 'chalk'
import Twit from 'twit'
import { drop, difference, isNil } from 'lodash'
import { Converter } from 'csvtojson'
import fileSync from 'lowdb/lib/file-sync'
import low from 'lowdb'

const getFilePath = file =>
  path.join(__dirname, file)

const requireFile = file =>
  require(getFilePath(file))

const {
  name: appName,
  description: appDesc,
  version: appVersion,
} = requireFile('package.json')

const {
  consumer_key,
  consumer_secret,
  access_token,
  access_token_secret,
  timeout_ms,
  keeped_tweets,
  concurrency
} = requireFile('config.json')

console.log(`🐦  ${chalk.bold(appName)} ${chalk.dim(appVersion)}`)
console.log(chalk.italic(appDesc))

const twitterAPI = new Twit({
  consumer_key,
  consumer_secret,
  access_token,
  access_token_secret,
  timeout_ms
})

const csvConverter = new Converter({
  checkType: false
})

const progressDb = low(getFilePath('progress.json'), {
  storage: fileSync
})

progressDb
  .defaults({
    'deleted': []
  }).value()

const deletedTweetsTable = progressDb.get('deleted')
const deletedTweets = []

const isSuccess = statusCode =>
  statusCode >= 200 && statusCode < 300

const isNotFound = statusCode =>
  statusCode === 404

const logResponse = (resp, tweetId) => {
  if (isNil(resp)) {
    return console.log(chalk.bold.red('No server response!'))
  }

  const { statusCode, request } = resp
  const { href } = request

  if (isSuccess(statusCode)) {
    console.log(`${chalk.bold.green('success  ')}  ${href}`)
    deletedTweets.push(tweetId)
  } else if (isNotFound(statusCode)) {
    console.log(`${chalk.bold.yellow('not found')}  ${href}`)
    deletedTweets.push(tweetId)
  } else {
    console.log(`${chalk.bold.red('failure  ')}  ${href}`)
  }
}

csvConverter.fromFile(getFilePath('tweets.csv'), (error, tweets) => {
  if (error) {
    return console.warn(error)
  }

  const toDeleteTweetsIds = difference(
    drop(tweets, keeped_tweets).map(t => t.tweet_id),
    deletedTweetsTable.value()
  )

  console.log(chalk.bold(`${toDeleteTweetsIds.length} tweets to delete.`))

  Promise.map(toDeleteTweetsIds, id => (
    twitterAPI.post(`statuses/destroy/${id}`)
      .then(({resp}) => logResponse(resp, id))
      .catch(error => console.warn(error))
  ), { concurrency })
    .then(() => {
      deletedTweetsTable.push(...deletedTweets).value()
      console.log(chalk.bold('Finished! Have a good day.'))
    })
})
