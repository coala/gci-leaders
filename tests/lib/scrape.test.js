/**
 * Scrape Library Test
 */

const fs = require('fs')

describe('lib.scrape', () => {
  it('should create a data.json file', () => {
    const path = `${__dirname}/../../out/data.json`
    const file = fs.existsSync(path)

    expect(file).toBeTruthy()
  })

  it('should create a data.min.json file', () => {
    const path = `${__dirname}/../../out/data.min.json`
    const file = fs.existsSync(path)

    expect(file).toBeTruthy()
  })

  it('should create a data.yml file', () => {
    const path = `${__dirname}/../../out/data.yml`
    const file = fs.existsSync(path)

    expect(file).toBeTruthy()
  })

  it('should create a dates.json file', () => {
    const path = `${__dirname}/../../out/dates.json`
    const file = fs.existsSync(path)

    expect(file).toBeTruthy()
  })
})
