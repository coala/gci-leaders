const fs = require('fs')
const Mustache = require('mustache')
const orgs = require('./out/data.json')

const template = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>GCI Leaders</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica,
          Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji",
          "Segoe UI Symbol";
        line-height: 1.5;
        max-width: 800px;
        margin: 0 auto;
        padding: 0 1em;
      }

      h1 {
        margin: .5em 0 0 0;
      }

      .orgs {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-around;
      }

      .org {
        flex: 0 0 25%;
        margin-bottom: 1em;
      }

      ul {
        padding-left: 1em;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <h1>GCI Current Leaders</h1>
    <i>The leading participants for each organization are listed alphabetically according to their "display name"</i>
    <div class="orgs">
      {{#orgs}}
        <div class="org">
          <h3>
            <a href="https://codein.withgoogle.com/organizations/{{slug}}">{{name}}</a>
            <p>Task Completed: {{completed_task_instance_count}}</p>
            {{#github}}
            <a href="https://github.com/{{github}}">
              <img src="https://assets-cdn.github.com/images/modules/logos_page/GitHub-Mark.png" height="14" />
            </a>
            {{/github}}
          </h3>
          <ul>
            {{#leaders}}
              <li>{{display_name}}</li>
            {{/leaders}}
            {{^leaders}}
              <li style="color: gray;">None</li>
            {{/leaders}}
          </ul>
        </div>
      {{/orgs}}
    </div>
  </body>
</html>
`

fs.writeFileSync('out/index.html', Mustache.render(template, { orgs }))
