const fetch = require('node-fetch')
const fs = require('fs')

async function getData() {
  const res = await fetch(
    'https://raw.githubusercontent.com/coala/gci-leaders/gh-pages/data.min.json'
  )

  const data = await res.json()
  fs.writeFileSync(`${__dirname}/../out/data.min.json`, JSON.stringify(data))
}

getData()
