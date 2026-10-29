SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help setup install build check init migrate start start-crm stop restart status backup clean

help:
	@echo "Hermès CRM : setup, install, build, check, init, start, start-crm, stop, restart, status, backup"
	@echo "Les modules se construisent avec : node scripts/customer-tools.mjs build <forms|char|calendar>"

setup:
	node scripts/local-project.mjs setup

install:
	node scripts/build-crm.mjs install

build:
	node scripts/build-crm.mjs build

check:
	node scripts/build-crm.mjs check

init migrate:
	node scripts/local-project.mjs init

start:
	node scripts/local-project.mjs start

start-crm:
	node scripts/local-project.mjs start-crm

stop:
	node scripts/local-project.mjs stop

restart:
	$(MAKE) stop
	$(MAKE) start

status:
	node scripts/local-project.mjs status

backup:
	node scripts/backup-local.mjs

# Réinitialise uniquement le cache Nx ; les bases et volumes sont conservés.
clean:
	cd apps/crm/ui && node .yarn/releases/yarn-4.18.1.cjs nx reset
