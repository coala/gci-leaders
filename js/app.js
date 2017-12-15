document.getElementById('ago').textContent = `(${timeDifference(
  new Date().getTime(),
  new Date(document.getElementById('time').dataset.time).getTime()
)})`

function timeDifference(current, previous) {
  const msPerMinute = 60 * 1000
  const msPerHour = msPerMinute * 60
  const msPerDay = msPerHour * 24
  const msPerMonth = msPerDay * 30
  const msPerYear = msPerDay * 365

  const elapsed = current - previous

  if (elapsed < msPerMinute) {
    return Math.round(elapsed / 1000) + ' seconds ago'
  } else if (elapsed < msPerHour) {
    return Math.round(elapsed / msPerMinute) + ' minutes ago'
  } else if (elapsed < msPerDay) {
    return Math.round(elapsed / msPerHour) + ' hours ago'
  } else if (elapsed < msPerMonth) {
    return 'approximately ' + Math.round(elapsed / msPerDay) + ' days ago'
  } else if (elapsed < msPerYear) {
    return 'approximately ' + Math.round(elapsed / msPerMonth) + ' months ago'
  } else {
    return 'approximately ' + Math.round(elapsed / msPerYear) + ' years ago'
  }
}

// select all leaderboards
var allLeaders = document.querySelectorAll('div.org ul')
allLeaders.forEach(function(orgList) {
  // shuffle each leaderboard
  for (var i = orgList.children.length; i >= 0; i--) {
    orgList.appendChild(orgList.children[(Math.random() * i) | 0])
  }
})

document.getElementById('progress').textContent = gciProgress()

function gciProgress() {
  const progress = document.getElementById('progress').dataset
  const competitionOpen = new Date(progress.competitionopen)
  const noClaims = new Date(progress.noclaims)
  const current = new Date()
  const percentagePassed =
    100 - (noClaims - current) / (noClaims - competitionOpen) * 100
  document
    .getElementsByClassName('progress-bar')[0]
    .setAttribute(
      'style',
      'width:' + percentagePassed + '%;height: 8px;border-radius: 100px;'
    )
  return (
    Math.round(percentagePassed) +
    '% passed, ' +
    timeDifference(noClaims, current).slice(0, -4) +
    ' before task claiming ends'
  )
}
