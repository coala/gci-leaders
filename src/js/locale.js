import init from './app'

var browserLocale

if (!localStorage.getItem('lang')) {
  var nav = window.navigator
  browserLocale =
    nav.language.split('-')[0] || nav.language || nav.userLanguage || ''
} else {
  browserLocale = localStorage.getItem('lang')
}

function updateTranslation(localex) {
  $.i18n({
    locale: localex,
  })

  $.i18n()
    .load('./i18n', localex)
    .done(function() {
      console.log('i18n:' + localex + ' locale loaded')
      $('body').i18n()
      $('html').attr('lang', localex)
      init()
    })
}

$(window).on('load', function() {
  var localeOptions = {
    English: 'en',
    Español: 'es',
    Polski: 'pl',
    'Norwegian Bokmål': 'nb_NO',
  }

  var locList = $('#lang-select')
  $.each(localeOptions, function(key, value) {
    locList.append(
      $('<option></option>')
        .attr('value', value)
        .text(key)
    )
  })

  updateTranslation(browserLocale)
  locList.val(browserLocale)
  locList.on('change', function() {
    updateTranslation(this.value)
    localStorage.setItem('lang', this.value)
  })
})
