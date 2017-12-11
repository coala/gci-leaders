const fetch = require('node-fetch')
const chattie = require('chattie')
const fs = require('fs')
const json2yaml = require('json2yaml')

const GITHUB_API_BASE = 'https://api.github.com'

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

async function fetchOrgs() {
  const res = await fetch(
    'https://codein.withgoogle.com/api/program/2017/organization/?status=2'
  )
  const { results } = await res.json()
  return results
}

async function fetchLeaders(id) {
  const res = await fetch(
    `https://codein.withgoogle.com/api/program/current/organization/${id}`
  )
  const { leaders } = await res.json()
  return leaders
}

async function searchGitHubOrgs(query) {
  const token = process.env.GITHUB_TOKEN
  const res = await fetch(
    `${GITHUB_API_BASE}/search/users?q=${query}%20type:org`,
    {
      headers: token ? { Authorization: `token ${token}` } : {},
    }
  )
  const { items } = await res.json()
  return items || []
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

async function fetchOrgsWithData() {
  const orgs = await fetchOrgs()
  const fetchingLeaders = orgs.map(org => fetchLeaders(org.id))
  const fetchingGitHub = orgs.map(org => findOrganization(org))
  const fetchingChat = orgs.map(org => chattie(org.irc_channel))
  const orgLeaders = await Promise.all(fetchingLeaders)
  const orgGitHub = await Promise.all(fetchingGitHub)
  const orgChats = await Promise.all(fetchingChat)

  return orgs.map((org, index) =>
    Object.assign(org, {
      leaders: orgLeaders[index],
      github: orgGitHub[index],
      chat: {
        url: orgChats[index].url,
        platform: chattie.CHAT[orgChats[index].type],
        image: CHAT_IMAGES[chattie.CHAT[orgChats[index].type]],
      },
    })
  )
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
