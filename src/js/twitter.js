import { getNodesDeep } from './utils'

const twitter_filter = (prev_tweet_count = 0) => {
  const twitter_handles = []
  const orgs = document.getElementsByClassName('org-info')

  for (let i = 0; i < orgs.length; i++) {
    const org_info = orgs[i].children
    const children = [].slice.call(org_info)
    const twitter_url = children.filter(
      x => x.nodeName === 'A' && x.host === 'twitter.com'
    )

    if (twitter_url.length > 0) {
      const twitter_account = twitter_url[0].pathname.substr(1)
      twitter_handles.push(twitter_account)
    }
  }

  const iframe_id = document.getElementById('twitter-widget-0')

  if (iframe_id !== null) {
    if (typeof iframe_id.contentWindow !== 'undefined') {
      const content_window_document = iframe_id.contentWindow.document
      const tweet_authors = content_window_document.getElementsByClassName(
        'TweetAuthor-screenName Identity-screenName'
      )
      const tweet_count = tweet_authors.length

      const load_button = content_window_document.getElementsByClassName(
        'timeline-LoadMore-prompt timeline-LoadMore-prompt--edge\
         timeline-ShowMoreButton--edge timeline-ShowMoreButton customisable'
      )[0]

      if (typeof load_button !== 'undefined') {
        load_button.onclick = () => twitter_filter(tweet_count)

        if (tweet_count > prev_tweet_count) {
          for (let k = 0; k < tweet_count; k++) {
            if (
              twitter_handles.indexOf(tweet_authors[k].innerHTML.substr(1)) > -1
            ) {
              const tweet = getNodesDeep(tweet_authors[k], 5)
              tweet.style.display = 'none'
            }
          }
        } else {
          setTimeout(() => twitter_filter(tweet_count), 1000)
        }
      } else {
        setTimeout(() => twitter_filter(), 1000)
      }
    } else {
      setTimeout(() => twitter_filter(), 1000)
    }
  } else {
    setTimeout(() => twitter_filter(), 1000)
  }
}
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
  js.setAttribute('onload', twitter_filter())
  fjs.parentNode.insertBefore(js, fjs)
})(document, 'script', 'twitter-wjs')
