const fs = require('fs')
const util = require('util')
const exec = util.promisify(require('child_process').exec)

module.exports.getLatestCommitMessage = () => exec('git log -1 --pretty=%B')

module.exports.loadQuery = name =>
  fs.readFileSync(`${__dirname}/queries/${name}.graphql`).toString()
