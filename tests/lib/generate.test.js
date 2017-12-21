/**
 * Generate Library Test
 */

const fs = require('fs')

describe('lib.generate', () => {
  it('should create an index.html file', () => {
    const path = `${__dirname}/../../out/index.html`
    const file = fs.existsSync(path)

    expect(file).toBeTruthy()
  })

  it('should create an index.html in the planet directory', () => {
    const path = `${__dirname}/../../out/planet/index.html`
    const file = fs.existsSync(path)

    expect(file).toBeTruthy()
  })
})
