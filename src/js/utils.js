export function timeDifference(current, previous) {
  const msPerMinute = 60 * 1000
  const msPerHour = msPerMinute * 60
  const msPerDay = msPerHour * 24
  const msPerMonth = msPerDay * 30
  const msPerYear = msPerDay * 365

  const elapsed = current - previous

  if (elapsed < msPerMinute) {
    return $.i18n('seconds-ago', Math.round(elapsed / 1000))
  } else if (elapsed < msPerHour) {
    return $.i18n('minutes-ago', Math.round(elapsed / msPerMinute))
  } else if (elapsed < msPerDay) {
    return $.i18n('hours-ago', Math.round(elapsed / msPerHour))
  } else if (elapsed < msPerMonth) {
    return $.i18n('days-ago', Math.round(elapsed / msPerDay))
  } else if (elapsed < msPerYear) {
    return $.i18n('months-ago', Math.round(elapsed / msPerMonth))
  } else {
    return $.i18n('years-ago', Math.round(elapsed / msPerYear))
  }
}

// this is needed for time expression translation.
// will be removed when we find a way
// to correctly strip the "ago" segment of a translation
export function timeDifferenceFuture(current, previous) {
  const msPerMinute = 60 * 1000
  const msPerHour = msPerMinute * 60
  const msPerDay = msPerHour * 24
  const msPerMonth = msPerDay * 30
  const msPerYear = msPerDay * 365

  const elapsed = current - previous

  if (elapsed < msPerMinute) {
    return $.i18n('seconds', Math.round(elapsed / 1000))
  } else if (elapsed < msPerHour) {
    return $.i18n('minutes', Math.round(elapsed / msPerMinute))
  } else if (elapsed < msPerDay) {
    return $.i18n('hours', Math.round(elapsed / msPerHour))
  } else if (elapsed < msPerMonth) {
    return $.i18n('days', Math.round(elapsed / msPerDay))
  } else if (elapsed < msPerYear) {
    return $.i18n('months', Math.round(elapsed / msPerMonth))
  } else {
    return $.i18n('years', Math.round(elapsed / msPerYear))
  }
}
