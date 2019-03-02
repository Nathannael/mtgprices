workflow "New workflow" {
  on = "push"
  resolves = ["push"]
}

action "login" {
  uses = "actions/heroku@466fea5e8253586a6df75b10e95447b0bfe383c1"
  args = "container:login"
  secrets = ["HEROKU_API_KEY"]
}

action "push" {
  uses = "actions/heroku@466fea5e8253586a6df75b10e95447b0bfe383c1"
  needs = "login"
  args = "container:push -a scgpricebot"
  secrets = ["HEROKU_API_KEY"]
}
