const fetch = require('node-fetch')
const fs = require('fs')

const GITHUB_API_BASE = 'https://api.github.com'

const MIN_SEARCH_SCORE = 10

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
      headers: token ? { Authorization: `token ${token}` } : {}
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
  const ghPattern = /(?:https?:\/\/)?(?:github\.com|gitter\.im)\/([a-zA-Z0-9-]+)/i
  const websites = [
    mailing_list,
    website_url,
    irc_channel,
    blog_url,
    guide_to_working_url,
  ]

  const orgFromWebsites = websites
    .map(website => (ghPattern.exec(website) || [])[1])
    .find(org => org)

  if (orgFromWebsites) {
    return orgFromWebsites
  }

  const orgFromDescription = (ghPattern.exec(description) || [])[1]

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
  const orgLeaders = await Promise.all(fetchingLeaders)
  const orgGitHub = await Promise.all(fetchingGitHub)

  return orgs.map((org, index) =>
    Object.assign(org, {
      leaders: orgLeaders[index],
      github: orgGitHub[index],
    })
  )
}

;(async () => {
  const data = await fetchOrgsWithData()
  
  // sort data by completed_task_instance_count
  data.sort((a, b) => 
    b.completed_task_instance_count - a.completed_task_instance_count
  )

  fs.writeFileSync('out/data.json', JSON.stringify(data))
})()
