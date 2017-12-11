const fetch = require('node-fetch')
const chattie = require('chattie')
const fs = require('fs')
const json2yaml = require('json2yaml')

const GH_USER_BASE = 'https://github.com/users'
const GH_API_BASE = 'https://api.github.com'
const GCI_API_BASE = 'https://codein.withgoogle.com/api'

const MIN_SEARCH_SCORE = 10

const CHAT_IMAGES = {
  GITTER: 'static/images/logos/gitter.png',
  SLACK: 'static/images/logos/slack.png',
  ZULIP: 'static/images/logos/zulip.png',
  ROCKET: 'static/images/logos/rocket.png',
  TELEGRAM: 'static/images/logos/telegram.png',
  IRC: 'static/images/logos/irc.png',
  OTHER: 'static/images/chat.png',
}

const GITHUB_OPTIONS = {
  headers: process.env.GITHUB_TOKEN
    ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
    : {},
}

async function fetchProgram() {
  const res = await fetch(`${GCI_API_BASE}/program/2017/`)
  return await res.json()
}

async function fetchOrgs() {
  const res = await fetch(`${GCI_API_BASE}/program/2017/organization/?status=2`)
  const { results } = await res.json()
  return results
}

async function fetchLeaders(id) {
  const res = await fetch(`${GCI_API_BASE}/program/current/organization/${id}`)
  const { leaders } = await res.json()
  return leaders
}

async function searchGitHubOrgs(query) {
  const res = await fetch(
    `${GH_API_BASE}/search/users?q=${query}%20type:org`,
    GITHUB_OPTIONS
  )
  const { items } = await res.json()
  return items || []
}

async function getGitHubUserHistory(user, from, to) {
  const commitPattern = /<a href="(?:[a-zA-Z1-9/-]+)">([a-zA-Z1-9/-]+)<\/a>/g
  const otherPattern = new RegExp(
    '<a href="/([a-zA-Z0-9/-]+)/(?:issues|pull)/[0-9]{1,5}" class="' +
      'content-title no-underline">',
    'g'
  )

  const actions = [
    'created_commits',
    'created_issues',
    'created_issues',
    'created_pull_requests',
    'created_pull_request_reviews',
  ]

  const fetchingHistory = actions.map(action =>
    fetch(`${GH_USER_BASE}/${user}/${action}?from=${from}&to=${to}`)
  )
  const responses = await Promise.all(fetchingHistory)
  const fetchingText = responses.map(res => res.text())
  const history = await Promise.all(fetchingText)

  let repos = []
  history.forEach(body => {
    repos = repos
      .concat(findMatches(body, commitPattern))
      .concat(findMatches(body, otherPattern))
  })

  return repos
}

function findMatches(input, pattern) {
  const output = []

  let match = pattern.exec(input)
  while (match) {
    output.push(match[1])
    match = pattern.exec(input)
  }

  return output
}

async function getGitHubUser(user) {
  const res = await fetch(`${GH_API_BASE}/users/${user}`, GITHUB_OPTIONS)
  let response = await res.json()
  if (response && response.message) {
    response = undefined
  }
  return response
}

async function findOrganization({
  name,
  description,
  mailing_list,
  website_url,
  irc_channel,
  blog_url,
  guide_to_working_url,
}) {
  const pattern = /(?:https?:\/\/)?(?:github\.com|gitter\.im)\/([a-zA-Z0-9-]+)/i
  const websites = [
    mailing_list,
    website_url,
    irc_channel,
    blog_url,
    guide_to_working_url,
  ]

  const orgFromWebsites = websites
    .map(website => (pattern.exec(website) || [])[1])
    .find(org => org)

  if (orgFromWebsites) {
    return orgFromWebsites
  }

  const orgFromDescription = (pattern.exec(description) || [])[1]

  if (orgFromDescription) {
    return orgFromDescription
  }

  console.warn(
    `Could not find GitHub org for ${name}. Resorting to GitHub API hit.`
  )

  const removePattern = /the|project|\([a-zA-Z]+\)/gi
  const searchQuery = name.replace(removePattern, '').trim()
  const searchResults = await searchGitHubOrgs(searchQuery)

  if (searchResults.length > 0 && searchResults[0].score > MIN_SEARCH_SCORE) {
    return searchResults[0].login
  }

  return null
}

async function findGitHubUser({ display_name }, org) {
  if (!org) return

  display_name = display_name.replace(/ /g, '')

  const displayNamePattern = /^[a-zA-Z0-9-]{1,39}$/

  const displayNameMatches = displayNamePattern.exec(display_name)
  if (!displayNameMatches) return

  const user = await getGitHubUser(display_name)
  if (!user) return

  const login = user.login

  const { competition_open_starts } = await fetchProgram()

  const updatedTime = new Date(user.updated_at)
  const openTime = new Date(competition_open_starts)

  if (updatedTime.getTime() - openTime.getTime() < 0) return

  const nov = await getGitHubUserHistory(login, '2017-11-28', '2017-11-30')
  const dec = await getGitHubUserHistory(login, '2017-12-01', '2017-12-31')
  const jan = await getGitHubUserHistory(login, '2018-01-01', '2018-01-17')
  const orgs = [...nov, ...dec, ...jan].map(repo => repo.split('/')[0])
  if (orgs.includes(org)) {
    return user.login
  }
}

async function fetchOrgsWithData() {
  const orgs = await fetchOrgs()
  const fetchingLeaders = orgs.map(org => fetchLeaders(org.id))
  const fetchingGitHub = orgs.map(org => findOrganization(org))
  const fetchingChat = orgs.map(org => chattie(org.irc_channel))
  const orgLeaders = await Promise.all(fetchingLeaders)
  const orgGitHub = await Promise.all(fetchingGitHub)
  const orgChats = await Promise.all(fetchingChat)

  const fetchingAll = orgs.map(async (org, index) => {
    const fetchingUsers = orgLeaders[index].map(user =>
      findGitHubUser(user, orgGitHub[index])
    )
    const orgUsers = await Promise.all(fetchingUsers)

    const leaders = orgLeaders[index].map((user, index) =>
      Object.assign(user, {
        github_account: orgUsers[index],
      })
    )

    return Object.assign(org, {
      leaders: leaders,
      github: orgGitHub[index],
      chat: {
        url: orgChats[index].url,
        platform: chattie.CHAT[orgChats[index].type],
        image: CHAT_IMAGES[chattie.CHAT[orgChats[index].type]],
      },
    })
  })

  return await Promise.all(fetchingAll)
}

async function fetchDates() {
  const res = await fetch('https://codein.withgoogle.com/api/program/current/')
  return res.json()
}

;(async () => {
  const data = await fetchOrgsWithData()
  const dates = await fetchDates()

  // sort data by completed_task_instance_count
  data.sort(
    (a, b) => b.completed_task_instance_count - a.completed_task_instance_count
  )

  // readable JSON
  fs.writeFileSync(
    `${__dirname}/../out/data.json`,
    JSON.stringify(data, null, 2)
  )
  // minified JSON
  fs.writeFileSync(`${__dirname}/../out/data.min.json`, JSON.stringify(data))
  // yaml data
  fs.writeFileSync(`${__dirname}/../out/data.yml`, json2yaml.stringify(data))

  fs.writeFileSync(`${__dirname}/../out/dates.json`, JSON.stringify(dates))
})()
