const fs = require('fs')
const Mustache = require('mustache')
const ncp = require('ncp').ncp
const orgs = require('./out/data.json')

const datetime = new Date(fs.statSync('./out/data.json').mtime).toUTCString()

ncp('static', 'out/static', err => {
  if (err) {
    console.error(err)
  }
})

fs.writeFileSync(
  'out/index.html',
  Mustache.render(fs.readFileSync('templates/main.html').toString(), {
    orgs,
    datetime,
  })
)
