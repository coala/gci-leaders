const fetch = require('node-fetch')
const fs = require('fs')

const GITHUB_CONTENT = 'https://raw.githubusercontent.com'

async function getData() {
  const res = await fetch(
    `${GITHUB_CONTENT}/coala/gci-leaders/gh-pages/data.min.json`
  )

  try {
    const data = await res.json()
    fs.writeFileSync(`${__dirname}/../out/data.min.json`, JSON.stringify(data))
  } catch (e) {
    console.warn('Could not gather data.min.json')
  }
}

async function getFeedItems() {
  const res = await fetch(
    `${GITHUB_CONTENT}/coala/gci-leaders/gh-pages/feed_items.json`
  )

  try {
    const items = await res.json()
    fs.writeFileSync(
      `${__dirname}/../out/feed_items.json`,
      JSON.stringify(items)
    )
  } catch (e) {
    console.warn('Could not gather feed_items.json')
  }
}

getData()
getFeedItems()
