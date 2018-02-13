const fetch = require('node-fetch')
const GraphQL = require('graphql-client')
const chattie = require('chattie')
const fs = require('fs')
const json2yaml = require('json2yaml')
const sortKeys = require('sort-keys')
const validUsername = require('valid-github-username')
const wdk = require('wikidata-sdk')
const cheerio = require('cheerio')

const { GITHUB_REPO_INFO_QUERY } = require('./queries')
const { getLatestCommitMessage } = require('./utils')

const GH_BASE = 'https://github.com'
const GH_USER_BASE = `${GH_BASE}/users`
const GH_ORG_BASE = `${GH_BASE}/orgs`
const GH_API_BASE = 'https://api.github.com'
const GH_GQL_BASE = 'https://api.github.com/graphql'
const GCI_API_BASE = 'https://codein.withgoogle.com/api'

const MIN_SEARCH_SCORE = 10

// The time to cache GitHub usernames for in milliseconds
const GITHUB_CACHE_TIME = 2 * 24 * 60 * 60 * 1000

// Wikidata property for Stack Exchange tag
const WIKI_SE_TAG = 'P1482'
// Wikidata property for "instance of"
const WIKI_INSTANCE_OF = 'P31'
// Wikidata property for "website account on"
const WIKI_ACCOUNT_ON = 'P553'
// Wikidata property for "website username"
const WIKI_ACCOUNT_USERNAME = 'P554'
// Wikidata item for GitLab
const WIKI_GITLAB = 'Q16639197'
// Wikidata item for organization
const WIKI_ORGANIZATION = 'Q43229'

// Prioritisation order of ranks on Wikidata, smaller is better
const WIKI_CLAIM_PRIORITY = {
  preferred: 1,
  normal: 2,
  deprecated: 3,
}

const CHAT_IMAGES = {
  GITTER: 'images/logos/gitter.png',
  SLACK: 'images/logos/slack.png',
  ZULIP: 'images/logos/zulip.png',
  ROCKET: 'images/logos/rocket.png',
  TELEGRAM: 'images/logos/telegram.png',
  IRC: 'images/logos/irc.png',
  OTHER: 'images/chat.png',
}

const GH_API_OPTIONS = {
  headers: process.env.GITHUB_TOKEN
    ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
    : {},
}

const GH_GQL_OPTIONS = {
  url: GH_GQL_BASE,
  headers: process.env.GITHUB_TOKEN
    ? { Authorization: `bearer ${process.env.GITHUB_TOKEN}` }
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

const client = GraphQL(GH_GQL_OPTIONS)

let COMPETITION_OPEN
let BUST_GITHUB_CACHE

let existingData = []
try {
  existingData = JSON.parse(
    fs.readFileSync(`${__dirname}/../out/data.min.json`).toString()
  )

  fs.renameSync(
    `${__dirname}/../out/data.min.json`,
    `${__dirname}/../out/data_old.json`
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

let repositoryInfo = {}
async function fetchRepositoryInfo(org) {
  if (repositoryInfo[org]) return repositoryInfo[org]

  const { data } = await client.query(GITHUB_REPO_INFO_QUERY, { org })

  if (data) {
    const info = data.organization.repositories.nodes.map(node => ({
      watchers: node.watchers.nodes,
      stargazers: node.stargazers.nodes,
      forks: node.forks.nodes,
    }))

    repositoryInfo[org] = info

    return info
  } else {
    return []
  }
}

async function getGitHubUserFromRepoInfo(org, displayName, shortName) {
  let repos = []
  try {
    repos = await fetchRepositoryInfo(org)
  } catch (e) {
    console.error(`Could not fetch repository info for ${org}...`)
  }

  let logins = []
  let names = {}

  repos.forEach(repo => {
    logins = logins
      .concat(repo.watchers.map(u => u.login.toLowerCase()))
      .concat(repo.stargazers.map(u => u.login.toLowerCase()))
      .concat(
        repo.forks
          .map(u => {
            const createdAt = new Date(u.createdAt)
            if (createdAt.getTime() > COMPETITION_OPEN.getTime()) {
              return u.owner.login.toLowerCase()
            }
          })
          .filter(login => login)
      )

    repo.watchers.forEach(watcher => {
      if (watcher.name) {
        names[watcher.name.toLowerCase()] = watcher.login
      }
    })
  })

  logins = logins.filter((item, pos, self) => self.indexOf(item) === pos)

  if (logins.includes(shortName.toLowerCase())) {
    return shortName
  }

  if (names[displayName.toLowerCase()]) {
    return names[displayName.toLowerCase()]
  }
}

async function checkGitHubUserExists(user) {
  const res = await fetch(`${GH_BASE}/${user}`)
  return res.status === 200
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

async function fetchSEtag(wikidata_id) {
  const wikiAPIurl = wdk.getEntities({
    ids: [wikidata_id],
    props: ['claims'],
  })
  const page = await fetch(wikiAPIurl)
  let data = await page.json()
  data = data.entities[wikidata_id]

  if (!(WIKI_SE_TAG in data.claims)) {
    return null
  }

  data.claims[WIKI_SE_TAG].sort(
    (a, b) => WIKI_CLAIM_PRIORITY[a.rank] - WIKI_CLAIM_PRIORITY[b.rank]
  )

  const url = wdk.simplify.claim(data.claims[WIKI_SE_TAG][0])
  const response = await fetch(url)
  const txt = await response.text()
  const html = cheerio.load(txt)

  const image = html('link')
    .filter((i, el) => html(el).attr('rel') === 'apple-touch-icon image_src')
    .attr('href')

  return {
    url,
    image,
  }
}

async function fetchInstance(wikidata_id) {
  const wikiAPIurl = wdk.getEntities(wikidata_id)
  const page = await fetch(wikiAPIurl)
  const { entities } = await page.json()
  const entity = entities[wikidata_id]

  if (!(WIKI_INSTANCE_OF in entity.claims)) {
    return
  }

  const instanceClaims = entity.claims[WIKI_INSTANCE_OF]

  if (!instanceClaims) {
    return
  }

  const instances = instanceClaims.map(
    claim => claim.mainsnak.datavalue.value.id
  )

  return instances
}

async function fetchGitLabOrg(wikidata_id) {
  const wikiAPIurl = wdk.getEntities(wikidata_id)
  const page = await fetch(wikiAPIurl)
  const { entities } = await page.json()
  const entity = entities[wikidata_id]

  if (!(WIKI_ACCOUNT_ON in entity.claims)) {
    return
  }

  const gitlabClaim = entity.claims[WIKI_ACCOUNT_ON].sort(
    (a, b) => WIKI_CLAIM_PRIORITY[a.rank] - WIKI_CLAIM_PRIORITY[b.rank]
  ).find(prop => prop.mainsnak.datavalue.value.id === WIKI_GITLAB)

  if (!(gitlabClaim && WIKI_ACCOUNT_USERNAME in gitlabClaim.qualifiers)) {
    return
  }

  const gitlabAccount =
    gitlabClaim.qualifiers[WIKI_ACCOUNT_USERNAME][0].datavalue.value

  return gitlabAccount
}

async function findWiki(name) {
  const APIurl = wdk.searchEntities({
    search: name,
    format: 'json',
  })
  const search = await fetch(APIurl)
  const response = await search.json()
  if (response && response.search.length) {
    const fetchingInstances = response.search.map(({ id }) => fetchInstance(id))
    const instances = await Promise.all(fetchingInstances)

    const results = response.search.map((result, index) => ({
      ...result,
      instances: instances[index],
    }))

    const orgInstances = results.filter(
      result => result.instances && result.instances.includes(WIKI_ORGANIZATION)
    )

    let wikidataurl
    let wikidataid
    if (orgInstances.length > 0) {
      wikidataurl = orgInstances[0].url
      wikidataid = orgInstances[0].id
    } else {
      wikidataurl = response.search[0].url
      wikidataid = response.search[0].id
    }

    const stack_exchange = await fetchSEtag(wikidataid)
    const gitlab = await fetchGitLabOrg(wikidataid)

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
        stack_exchange,
        gitlab,
        wikipedia: wikipediaurls,
        wikidata: wikidataurl,
      }
    } else {
      return {
        stack_exchange,
        gitlab,
        wikipedia: null,
        wikidata: wikidataurl,
      }
    }
  } else {
    return {
      wikipedia: null,
      wikidata: null,
      stack_exchange: null,
      gitlab: null,
    }
  }
}

async function findGitHubUser(displayName, org) {
  if (!org) return

  const shortName = validUsername(displayName)

  let userInOrg
  try {
    userInOrg = await findGitHubUserInOrg(displayName, org)
  } catch (e) {
    console.error(`Failed to find user ${displayName} in org ${org}...`)
  }
  if (userInOrg) {
    console.log(`${displayName}: ${userInOrg} (method: user in org)`)
    return userInOrg
  }

  let user
  try {
    user = await getGitHubUser(shortName)
  } catch (e) {
    console.error(`Failed to find user ${shortName}...`)
  }

  if (!user) {
    const userFromRepo = await getGitHubUserFromRepoInfo(
      org,
      displayName,
      shortName
    )

    if (!userFromRepo) {
      return
    }

    user = userFromRepo
  }

  const login = user.login

  const updatedTime = new Date(user.updated_at)

  if (updatedTime.getTime() - COMPETITION_OPEN.getTime() < 0) return

  let orgs = []
  try {
    const nov = await getGitHubUserHistory(login, '2017-11-28', '2017-11-30')
    const dec = await getGitHubUserHistory(login, '2017-12-01', '2017-12-31')
    const jan = await getGitHubUserHistory(login, '2018-01-01', '2018-01-17')
    orgs = [...nov, ...dec, ...jan].map(repo => repo.split('/')[0])
  } catch (e) {
    console.error('Could not fetch user history...')
  }

  if (orgs.includes(org)) {
    console.log(`${displayName}: ${user.login} (method: found user from name)`)
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

function checkGitHubUserCacheExpired(user) {
  if (user && user.github_updated) {
    return Date.now() - user.github_updated > GITHUB_CACHE_TIME
  }
}

async function freshenUserGitHubCache(user, existingUser, organization) {
  if (
    !(
      existingUser &&
      existingUser.github_updated &&
      existingUser.github_account
    ) ||
    BUST_GITHUB_CACHE
  ) {
    return {
      login: await findGitHubUser(user.display_name, organization),
      updated: Date.now(),
    }
  }

  if (checkGitHubUserCacheExpired(existingUser)) {
    let exists
    try {
      exists = await checkGitHubUserExists(user.github_account)
    } catch (e) {
      exists = false
    }

    if (exists) {
      return {
        login: existingUser.github_account,
        updated: Date.now(),
      }
    } else {
      return {
        login: await findGitHubUser(user.display_name, organization),
        updated: Date.now(),
      }
    }
  } else {
    return {
      login: existingUser.github_account,
      updated: existingUser.github_updated,
    }
  }
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
    await fetchRepositoryInfo(orgGitHub[index])

    const existingOrg = existingData.find(existing => existing.id === org.id)
    const fetchingUsers = orgLeaders[index].map(async user => {
      let existingUser
      if (existingOrg && existingOrg.leaders) {
        existingUser = existingOrg.leaders.find(leader => leader.id === user.id)
      }

      return await freshenUserGitHubCache(user, existingUser, orgGitHub[index])
    })
    const orgUsers = await Promise.all(fetchingUsers)

    const leaders = orgLeaders[index].map((user, index) => {
      return Object.assign(user, {
        github_account: orgUsers[index] ? orgUsers[index].login : null,
        github_updated: orgUsers[index] ? orgUsers[index].updated : null,
      })
    })

    return Object.assign(org, {
      leaders: leaders,
      github: orgGitHub[index],
      gitlab: orgWiki[index].gitlab,
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
      stack_exchange: orgWiki[index].stack_exchange,
    })
  })

  return await Promise.all(fetchingAll)
}

async function fetchDates() {
  const res = await fetch('https://codein.withgoogle.com/api/program/current/')
  return res.json()
}

;(async () => {
  const { competition_open_starts } = await fetchProgram()
  COMPETITION_OPEN = new Date(competition_open_starts)

  const { stdout } = await getLatestCommitMessage()
  BUST_GITHUB_CACHE = stdout.toLowerCase().includes('bust-cache')

  if (BUST_GITHUB_CACHE) {
    console.log('Busting cache...')
  }

  const orgs = await fetchOrgsWithData()
  const dates = await fetchDates()

  // sort data by completed_task_instance_count
  orgs.sort(
    (a, b) => b.completed_task_instance_count - a.completed_task_instance_count
  )

  const data = sortKeys({ orgs }, { deep: true }).orgs

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
