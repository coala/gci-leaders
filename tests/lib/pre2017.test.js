/**
 * Pre2017 Library Test
 */

const fs = require('fs')
const pre2017 = require('../../lib/pre2017')

describe('lib.pre2017', () => {
  it('should have the correct contents', async () => {
    const expectedData = JSON.parse(
      fs.readFileSync(`${__dirname}/../__data__/pre2017.json`)
    )
    const pre2017Response = await pre2017()

    expect(pre2017Response).toEqual(expectedData)
  })
})
