const fs = require('fs')
const Mustache = require('mustache')
const ncp = require('ncp').ncp
const orgs = require('./out/data.json')

const datetime = new Date(fs.statSync('./out/data.json').mtime).toUTCString()
const rootURL = process.env.URL

ncp('static', 'out/static', err => {
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
  'out/index.html',
  Mustache.render(fs.readFileSync('templates/main.html').toString(), {
    withLeader,
    datetime,
    rootURL,
    noLeader,
  })
)
