const fs = require('fs')
const Mustache = require('mustache')
const mapKeys = require('lodash.mapkeys')
const orgs = require('../out/data.json')
const dates = require('../out/dates.json')
const planet = require('../out/blog_planet.json')
const manifest = require('../out/manifest.json')

const time = fs.statSync(`${__dirname}/../out/data.json`).mtime
const datetime = new Date(time).toUTCString()
const rootURL = process.env.URL

const competitionOpen = new Date(dates.competition_open_starts)
const noClaims = new Date(dates.competition_open_ends)

const noLeader = []
const withLeader = orgs.filter(org => {
  if (!org.leaders.length) noLeader.push(org)
  return org.leaders.length
})

/*
 * Replace dot in manifest key with dash
 * because mustache can't escape dot
 */
const assets = mapKeys(manifest, (val, key) => {
  return key.replace('.', '-')
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
    assets,
  })
)

fs.mkdirSync(`${__dirname}/../out/planet`)

fs.writeFileSync(
  `${__dirname}/../out/planet/index.html`,
  Mustache.render(fs.readFileSync('templates/planet.html').toString(), {
    planet,
  })
)
