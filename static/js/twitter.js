!(function(d, s, id) {
  var js,
    fjs = d.getElementsByTagName(s)[0],
    p = /^http:/.test(d.location) ? 'http' : 'https'
  if (d.getElementById(id)) {
    return
  }
  js = d.createElement(s)
  js.id = id
  js.src = p + '://platform.twitter.com/widgets.js'
  js.setAttribute('load', 'twitter_filter()')
  fjs.parentNode.insertBefore(js, fjs)
})(document, 'script', 'twitter-wjs')
