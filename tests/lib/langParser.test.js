/**
 * langParser Library Test
 */

const fs = require('fs')
const iso639 = require('iso-639-1')

const testLangs = ['en', 'es', 'ja_AK', 'fr']
const expectedLangs = ['English', 'Español', '日本語', 'Français']

describe('lib.langParser', () => {
  it('should get nativeName for each language', () => {
    const resultLangs = []
    testLangs.forEach(function(value) {
      const normalizedName = value.split('_')[0]
      const nativeName = iso639.getNativeName(normalizedName)
      resultLangs.push(nativeName)
    })

    expect(resultLangs).toEqual(expectedLangs)
  })
})
