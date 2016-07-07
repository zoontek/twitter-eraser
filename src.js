import Promise from 'bluebird'

import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import Twit from 'twit'
import { drop, difference, isNil } from 'lodash'
import { Converter } from 'csvtojson'
import storage from 'lowdb/lib/file-sync'
import low from 'lowdb'

const parseRootJsonFile = file =>
  JSON.parse(fs.readFileSync(path.join(__dirname, `${file}.json`)))

const {
  name: appName,
  description: appDesc,
  version: appVersion,
} = parseRootJsonFile('package')

const {
  consumer_key,
  consumer_secret,
  access_token,
  access_token_secret,
  timeout_ms,
  keeped_tweets,
  concurrency
} = parseRootJsonFile('config')

console.log(`🐦  ${chalk.bold(appName)} ${chalk.dim(appVersion)}`)
console.log(chalk.italic(appDesc))

const twitterAPI = new Twit({
  consumer_key,
  consumer_secret,
  access_token,
  access_token_secret,
  timeout_ms
})

const csvConverter = new Converter({ checkType: false })
const progressDb = low(path.join(__dirname, 'progress.json'), { storage })
progressDb.defaults({ 'deleted': [] }).value()
const deletedTweetsTable = progressDb.get('deleted')
const deletedTweets = []

csvConverter.fromFile(path.join(__dirname, 'tweets.csv'), (error, tweets) => {
  if (error) {
    return console.warn(error)
  }

  const tweetsToDelete = drop(tweets, keeped_tweets).map(t => t.tweet_id)
  const allTweetsMinusDeleted = difference(tweetsToDelete, deletedTweetsTable.value())

  console.log(chalk.bold(`${allTweetsMinusDeleted.length} tweets to delete.`))

  Promise.map(allTweetsMinusDeleted, id => (
    twitterAPI.post(`statuses/destroy/${id}`)
      .then(({resp}) => {
        if (isNil(resp)) {
          return console.log(chalk.bold.red('No server response!'))
        }

        const { statusCode, request } = resp

        if (statusCode >= 200 && statusCode < 300) {
          console.log(`${chalk.bold.green('success  ')}  ${request.href}`)
          deletedTweets.push(id)
        } else if (statusCode === 404) {
          console.log(`${chalk.bold.yellow('not found')}  ${request.href}`)
          deletedTweets.push(id)
        } else {
          console.log(`${chalk.bold.red('failure  ')}  ${request.href}`)
        }
      })
      .catch(error => console.warn(error))
  ), { concurrency })
    .then(() => {
      deletedTweetsTable.push(...deletedTweets).value()
      console.log(chalk.bold('Finished! Have a good day.'))
    })
})
