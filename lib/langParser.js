const fs = require('fs')
const iso639 = require('iso-639-1')

const availableLanguages = {}

fs.readdir(`${__dirname}/../static/i18n`, (err, items) => {
  items.forEach(function(value) {
    const langName = value.substring(0, value.indexOf('.'))
    const normalizedName = langName.split('_')[0]
    const nativeName = iso639.getNativeName(normalizedName)
    availableLanguages[nativeName] = langName
  })
})

module.exports = availableLanguages
