const fetch = require('node-fetch')
const chattie = require('chattie')
const fs = require('fs')
const json2yaml = require('json2yaml')
const validUsername = require('valid-github-username')
const wdk = require('wikidata-sdk')

const GH_USER_BASE = 'https://github.com/users'
const GH_ORG_BASE = 'https://github.com/orgs'
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

const GH_API_OPTIONS = {
  headers: process.env.GITHUB_TOKEN
    ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
    : {},
}

const GH_WEB_OPTIONS = {
  headers: {
    Accept: 'text/html',
    'Accept-Encoding': 'utf8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0',
  },
  compress: false,
}

let existingData = []
try {
  existingData = JSON.parse(
    fs.readFileSync(`${__dirname}/../out/data.min.json`).toString()
  )
} catch (e) {
  console.log('No existing data...')
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
    GH_API_OPTIONS
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
  const res = await fetch(`${GH_API_BASE}/users/${user}`, GH_API_OPTIONS)
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

async function findWiki(name) {
  const APIurl = wdk.searchEntities({
    search: name,
    format: 'json',
  })
  const search = await fetch(APIurl)
  const response = await search.json()
  if (response && response.search.length) {
    const wikidataurl = response.search[0].url
    const wikidataid = response.search[0].id

    const entityAPIurl = wdk.getEntities({
      ids: [wikidataid],
      props: ['sitelinks'],
      format: 'json',
    })
    const entitydata = await fetch(entityAPIurl)
    let sitelinks = await entitydata.json()
    sitelinks = sitelinks.entities[wikidataid].sitelinks
    if (Object.keys(sitelinks).length) {
      const wikipediaurls = Object.assign(
        ...Object.entries(sitelinks).map(([site, title]) => ({
          [site.slice(0, -4)]: wdk.getSitelinkUrl(title),
        }))
      )
      return {
        wikipedia: wikipediaurls,
        wikidata: wikidataurl,
      }
    } else {
      return {
        wikipedia: null,
        wikidata: wikidataurl,
      }
    }
  } else {
    return {
      wikipedia: null,
      wikidata: null,
    }
  }
}

async function findGitHubUser(displayName, org) {
  if (!org) return

  const shortName = validUsername(displayName)

  const username = await findGitHubUserInOrg(displayName, org)
  if (username) return username

  const displayNamePattern = /^[a-zA-Z0-9-]{1,39}$/

  const displayNameMatches = displayNamePattern.exec(shortName)
  if (!displayNameMatches) return

  const user = await getGitHubUser(shortName)
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

async function findGitHubUserInOrg(user, org) {
  const pattern = new RegExp(
    '<a class="css-truncate-target f4" href="/([a-zA-Z0-9-]{1,39})">'
  )
  const res = await fetch(
    `${GH_ORG_BASE}/${org}/people?query=${user}`,
    GH_WEB_OPTIONS
  )
  const body = await res.text()
  const match = pattern.exec(body)
  return match ? match[1] : null
}

async function fetchOrgsWithData() {
  const orgs = await fetchOrgs()
  const fetchingLeaders = orgs.map(org => fetchLeaders(org.id))
  const fetchingGitHub = orgs.map(org => {
    const existingOrg = existingData.find(existing => existing.id === org.id)
    if (existingOrg && existingOrg.github) return existingOrg.github
    else return findOrganization(org)
  })
  const fetchingChat = orgs.map(org => {
    const existingOrg = existingData.find(existing => existing.id === org.id)
    if (existingOrg && existingOrg.chat) return existingOrg.chat
    else return chattie(org.irc_channel)
  })
  const fetchingWiki = orgs.map(org => findWiki(org.name))
  const orgLeaders = await Promise.all(fetchingLeaders)
  const orgGitHub = await Promise.all(fetchingGitHub)
  const orgChats = await Promise.all(fetchingChat)
  const orgWiki = await Promise.all(fetchingWiki)

  const fetchingAll = orgs.map(async (org, index) => {
    const existingOrg = existingData.find(existing => existing.id === org.id)
    const fetchingUsers = orgLeaders[index].map(user => {
      if (existingOrg && existingOrg.leaders) {
        const existingUser = existingOrg.leaders.find(
          leader => leader.id === user.id
        )
        if (existingUser && existingUser.github_account) {
          return existingUser.github_account
        }
      }

      return findGitHubUser(user.display_name, orgGitHub[index])
    })
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
        platform: orgChats[index].platform
          ? orgChats[index].platform
          : chattie.CHAT[orgChats[index].type],
        image: orgChats[index].image
          ? orgChats[index].image
          : CHAT_IMAGES[chattie.CHAT[orgChats[index].type]],
      },
      wikipedia_urls: orgWiki[index].wikipedia,
      wikidata_url: orgWiki[index].wikidata,
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
