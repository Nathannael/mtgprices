workflow "Deploy on Heroku" {
  on = "push"
  resolves = [
    "verify-deployment",
  ]
}

# Login
action "login" {
  uses = "actions/heroku@master"
  args = "container:login"
  secrets = ["HEROKU_API_KEY"]
}

action "push-production" {
  needs = ["login"]
  uses = "actions/heroku@master"
  args = ["container:push", "--app", "$HEROKU_APP", "worker"]
  env = {
    HEROKU_APP = "scgpricebot"
  }
}

action "release-production" {
  needs = ["push-production"]
  uses = "actions/heroku@master"
  args = ["container:release", "--app", "$HEROKU_APP", "worker"]
  env = {
    HEROKU_APP = "scgpricebot"
  }
}

action "verify-deployment" {
  needs = ["release-production"]
  uses = "actions/heroku@master"
  args = ["apps:info", "$HEROKU_APP"]
  env = {
    HEROKU_APP = "scgpricebot"
  }
}
