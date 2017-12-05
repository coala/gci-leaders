const fetch = require('node-fetch')
const fs = require('fs')

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

async function fetchOrgsWithLeaders() {
  const orgs = await fetchOrgs()
  const fetchingLeaders = orgs.map(org => fetchLeaders(org.id))
  const orgLeaders = await Promise.all(fetchingLeaders)

  return orgs.map((org, index) =>
    Object.assign(org, {
      leaders: orgLeaders[index],
    })
  )
}

;(async () => {
  const data = await fetchOrgsWithLeaders()
  
  // sort data by completed_task_instance_count
  data.sort((a, b) => 
    b.completed_task_instance_count - a.completed_task_instance_count
  )

  fs.writeFileSync('out/data.json', JSON.stringify(data))
})()
