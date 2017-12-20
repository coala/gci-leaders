function twitter_filter() {
  var twitter_handles = [];
  for(var i=0; i<document.getElementsByClassName('org-info').length; i++) {
    var org_info = document.getElementsByClassName('org-info')[i];
    for(var j=0; j<org_info.children.length; j++) {
      if(org_info.children[j].href !== undefined) {
        if(org_info.children[j].href.startsWith('https://twitter.com/')) {
          twitter_handles.push(org_info.children[j].href.substr(20));
        }
      }
    }
  }
  if(document.getElementById('twitter-widget-0') !== null) {
    var tweet_authors = document.getElementById('twitter-widget-0')
        .contentWindow.document
        .getElementsByClassName('TweetAuthor-screenName Identity-screenName');
    for(i=0; i<tweet_authors.length; i++) {
      if(twitter_handles.indexOf(tweet_authors[i].innerHTML.substr(1)) > -1) {
        tweet_authors[i].parentNode.parentNode.parentNode.parentNode
        .parentNode.style.display = "none";
      }
    }
  }
  else {setTimeout(twitter_filter, 1000);}
}
