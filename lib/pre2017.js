const fetch = require('node-fetch')
const cheerio = require('cheerio')
const https = require('https')

const PRE_URL = [
  'https://codein.withgoogle.com/archive/2016',
  'https://codein.withgoogle.com/archive/2015',
  'https://www.google-melange.com/archive/gci/2014',
  'https://www.google-melange.com/archive/gci/2013',
  'https://www.google-melange.com/archive/gci/2012',
  'https://www.google-melange.com/archive/gci/2011',
  'https://www.google-melange.com/archive/gci/2010',
]

const CODEIN_WIKI_URL = 'https://en.wikipedia.org/wiki/Google_Code-in'

async function fetchText(url) {
  const agent = new https.Agent({
    rejectUnauthorized: false,
  })
  const res = await fetch(url, {
    agent,
  })

  return await res.text()
}

async function fetchPre2017(year, url) {
  const htmlResponse = await fetchText(url)
  const json =
    year > 2014
      ? await scrapeCodein(htmlResponse)
      : await scrapeMelange(htmlResponse, year)

  return json
}

async function scrapeCodein(html) {
  const $ = cheerio.load(html)
  const mainSelector =
    'section.home__winners > div.fixed-width > ul.no-style-list > li'

  const resultObj = $(mainSelector).map((index, element) => ({
    name: getListText($, element, 'div.home__winner-box-header > h3 > a')[0],
    winners: getListText($, element, 'div:first-child > ul > li > strong'),
    finalists: getListText($, element, 'div:last-child > ul > li'),
  }))

  return resultObj.get()
}

async function scrapeMelange(html, year) {
  const $ = cheerio.load(html)

  if (year < 2012) {
    const mainSelector = 'div.main'

    const resultObj = $(mainSelector).map((index, element) => ({
      winners: getListText($, element, 'ul:first-of-type > li'),
      organizations: getListText($, element, 'ul:last-child > li a'),
    }))

    return resultObj.get()
  }

  const mainSelector = 'div.org-winners-card'

  const resultObj = $(mainSelector).map((index, element) => {
    const orgInfo = {
      name: getListText($, element, 'div.mdl-card__title > a')[0],
      winners: getListText($, element, 'ul:first-of-type > li'),
    }

    if (year === 2014) {
      orgInfo.finalists = getListText($, element, 'ul:last-child > li')
    }

    return orgInfo
  })

  return resultObj.get()
}

async function fetchStatistics(year, html) {
  const $ = cheerio.load(html)
  const statTable = $('table.wikitable.sortable > tbody > tr').slice(1)

  const tableByYear = statTable
    .filter((index, element) => {
      const yearStr = removeNewLine(
        removeInsideBrackets(getListText($, element, 'td')[0])
      )
      return yearStr === String(year)
    })
    .first()

  const tableData = getListText($, tableByYear, 'td')

  const data = tableData.map(data => parseInt(data))

  return {
    number_of_organizations: data[1],
    number_of_participants: data[2],
    total_tasks_completed: data[3],
  }
}

function getListText(html, element, selector) {
  return html(element)
    .find(selector)
    .map((index, list) => html(list).text())
    .get()
}

function removeInsideBrackets(str) {
  return str.replace(/(\[.*?\]|\(.*?\)) */g, '')
}

function removeNewLine(str) {
  return str.replace(/\n/g, '')
}

module.exports = async () => {
  const wikiResponse = await fetchText(CODEIN_WIKI_URL)

  const fetchingPre2017 = PRE_URL.map(async url => {
    const year = parseInt(url.split('/').pop())

    return {
      year,
      statistics: await fetchStatistics(year, wikiResponse),
      orgs: await fetchPre2017(year, url),
    }
  })

  return await Promise.all(fetchingPre2017)
}
