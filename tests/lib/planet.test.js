/**
 *  Planet Library Test
 */

const fs = require('fs')

describe('lib.planet', () => {
  it('should create a blog_planet.json file', () => {
    const path = `${__dirname}/../../out/blog_planet.json`
    const file = fs.existsSync(path)

    expect(file).toBeTruthy()
  })
})
