const RSS = require('rss')
const generateDiff = require('deep-diff').diff

function createLeadersHash(array) {
  return array.reduce((hash, elem) => {
    hash[elem.id] = elem
    return hash
  }, {})
}

function createOrgHash(array) {
  let rank = 0
  return array.reduce((hash, elem) => {
    rank++
    elem.rank = rank
    elem.leaders = createLeadersHash(elem.leaders)
    hash[elem.slug] = elem
    return hash
  }, {})
}

module.exports = ({
  data: newData,
  data_old: oldData,
  feed_items: current,
  data_updated: dataUpdated,
}) => {
  const oldOrgs = createOrgHash(oldData)
  const newOrgs = createOrgHash(newData)

  if (oldOrgs && newOrgs) {
    const diffs = generateDiff(oldOrgs, newOrgs) || []

    const feedItems = current ? current.items : []

    const currentUpdated = new Date(current ? current.lastUpdated : '')
    if (currentUpdated.getTime() !== dataUpdated.getTime()) {
      diffs.forEach(({ kind, path, lhs, rhs, item }) => {
        const organization = oldOrgs[path[0]]

        const itemPath = path.slice(1)
        const stringPath = itemPath.join('/')
        const finalProperty = itemPath[itemPath.length - 1]

        let title = ''

        if (itemPath[0] === 'leaders' && itemPath.length === 2) {
          if (kind === 'N') {
            title = `New Leader for ${organization.name}`
          } else if (kind === 'D') {
            title = `Leader Removed from ${organization.name}`
          }

          const user = rhs || lhs

          return feedItems.push({
            title,
            description: `${organization.name} ${
              kind === 'N' ? 'added' : 'removed'
            } ${user.display_name} ${
              kind === 'N' ? 'to' : 'from'
            } the leaderboard.`,
            date: dataUpdated,
            custom_elements: [
              {
                'org:name': organization.name,
              },
              {
                'org:slug': organization.slug,
              },
              {
                'org:id': organization.id,
              },
              {
                'property:path': stringPath,
              },
              {
                'property:type': kind === 'N' ? 'addition' : 'deletion',
              },
              {
                'property:display_name': user.display_name,
              },
              {
                'property:id': user.id,
              },
              {
                'property:github_account': user.github_account,
              },
            ],
          })
        }

        if (itemPath[0] === 'leaders') {
          return
        }

        if (finalProperty === 'completed_task_instance_count') {
          title = `Completed Tasks Updated for ${organization.name}`
        } else if (finalProperty === 'rank') {
          title = `Organization Rank Updated for ${organization.name}`
        } else {
          title = `Updated "${finalProperty}" for ${organization.name}`
        }

        if (kind === 'A') {
          return feedItems.push({
            title,
            date: dataUpdated,
            custom_elements: [
              {
                'org:name': organization.name,
              },
              {
                'org:slug': organization.slug,
              },
              {
                'org:id': organization.id,
              },
              {
                'property:path': stringPath,
              },
              {
                'property:type': item.kind === 'N' ? 'addition' : 'deletion',
              },
              {
                'property:item': item.rhs,
              },
            ],
          })
        }

        return feedItems.push({
          title,
          description: `${
            organization.name
          } changed ${finalProperty} from ${lhs} to ${rhs}.`,
          date: dataUpdated,
          custom_elements: [
            {
              'org:name': organization.name,
            },
            {
              'org:slug': organization.slug,
            },
            {
              'org:id': organization.id,
            },
            {
              'property:path': stringPath,
            },
            {
              'property:type': 'change',
            },
            {
              'property:old': lhs,
            },
            {
              'property:new': rhs,
            },
          ],
        })
      })

      const feed = new RSS({
        title: 'Google Code-in Leaders',
        description: 'A feed for Google Code-in updates',
        site_url: process.env.URL || 'https://gci-leaders.netlify.com',
        feed_url: `${process.env.URL ||
          'https://gci-leaders.netlify.com'}/feed.xml`,
        pubDate: new Date(),
        custom_namespaces: {
          org: 'https://g.co/gci',
          property: 'https://g.co/gci',
        },
      })

      feedItems.forEach(item => feed.item(item))

      const feedData = {
        items: feedItems,
        lastUpdated: dataUpdated,
      }

      return {
        feed_items: JSON.stringify(feedData),
        feed_xml: feed.xml(),
      }
    }
  }
}
