/**
 * Gather Library Test
 */

const fs = require('fs')

describe('lib.gather', () => {
  it('should create a data.min.json file', () => {
    const path = `${__dirname}/../../out/data.min.json`
    const file = fs.existsSync(path)

    expect(file).toBeTruthy()
  })
})
