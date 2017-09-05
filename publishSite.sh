#!/usr/bin/env bash

# See https://docs.travis-ci.com/user/pull-requests/#Security-Restrictions-when-testing-Pull-Requests
if [ "${TRAVIS_PULL_REQUEST}" = "false" ]; then

    git submodule init
    git submodule update

    cd libs/apisense-web-helper
    npm install
    npm run-script gulp build
    cd -

    gem install jekyll;
    jekyll build;

    # Init & configure ssh agent
    eval "$(ssh-agent -s)"
    chmod 600 .travis_rsa
    ssh-add .travis_rsa

    mkdir .deploy
    cd .deploy
    git clone --depth 1 --branch gh-pages --single-branch $DEPLOY_REPO . || (git init && git remote add -t gh-pages origin $DEPLOY_REPO)
    rm -rf ./*
    cp -r ../_site/* .
    git add -A .
    git commit -m 'Site updated'
    git branch -m gh-pages
    git push -q -u origin gh-pages
fi