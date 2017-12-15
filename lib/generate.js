const fs = require('fs')
const Mustache = require('mustache')
const ncp = require('ncp').ncp
const orgs = require('../out/data.json')
const dates = require('../out/dates.json')
const planet = require('../out/blog_planet.json')

const time = fs.statSync(`${__dirname}/../out/data.json`).mtime
const datetime = new Date(time).toUTCString()
const rootURL = process.env.URL

const competitionOpen = new Date(dates.competition_open_starts)
const noClaims = new Date(dates.competition_open_ends)

ncp('static', 'out', err => {
  if (err) {
    console.error(err)
  }
})

const noLeader = []
const withLeader = orgs.filter(org => {
  if (!org.leaders.length) noLeader.push(org)
  return org.leaders.length
})

fs.writeFileSync(
  `${__dirname}/../out/index.html`,
  Mustache.render(fs.readFileSync('templates/main.html').toString(), {
    withLeader,
    datetime,
    rootURL,
    noLeader,
    competitionOpen,
    noClaims,
  })
)

fs.mkdirSync(`${__dirname}/../out/planet`)

fs.writeFileSync(
  `${__dirname}/../out/planet/index.html`,
  Mustache.render(fs.readFileSync('templates/planet.html').toString(), {
    planet,
  })
)
