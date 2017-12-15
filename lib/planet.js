const data = require('../out/data.json')
const feedFinder = require('find-rss')
const fs = require('fs')
const feedParser = require('feed-read-parser')
const gciStart = new Date('November 27, 2017')

const errs = []
let articles = []

function getFeeds(feedUrls, i, cb) {
  let feedUrl = feedUrls[i]
  if (!feedUrl) return cb(errs, articles)
  feedParser.get(feedUrl, function(err, _articles) {
    if (err) errs.push(err.message + ' ' + feedUrl)
    else {
      articles = articles.concat(_articles)
    }
    getFeeds(feedUrls, i + 1, cb)
  })
}

async function getFeedLinks(data) {
  const linkPromises = data.map(org => {
    const { blog_url } = org
    if (blog_url) {
      return feedFinder(blog_url)
        .catch(err => console.error(err))
        .then(res => {
          if (res.length > 0) {
            return res[0].url
          }
        })
    }
  })
  return await Promise.all(linkPromises)
}

function wordInString(s, word) {
  return new RegExp('\\b' + word + '\\b', 'i').test(s)
}

;(async () => {
  const feedLinks = (await getFeedLinks(data)).filter(link => link)
  getFeeds(feedLinks, 0, (errs, articles) => {
    if (errs.length > 0) {
      errs.forEach(err => console.error(err))
    }
    articles.forEach(
      article => (article.published = new Date(article.published))
    )
    articles = articles.filter(
      article =>
        article.published > gciStart ||
        wordInString(article.content, 'Google Code-In')
    )
    articles.sort((a, b) => b.published - a.published)
    fs.writeFileSync(
      `${__dirname}/../out/blog_planet.json`,
      JSON.stringify(articles)
    )
  })
})()
