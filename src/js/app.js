import { timeDifference, timeDifferenceFuture } from './utils'

export default function init() {
  document.getElementById('ago').textContent = `(${timeDifference(
    new Date().getTime(),
    new Date(document.getElementById('time').dataset.time).getTime()
  )})`

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
    return $.i18n(
      'passed',
      Math.round(percentagePassed),
      timeDifferenceFuture(noClaims, current)
    )
  }
}
