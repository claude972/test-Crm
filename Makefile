# KovaaLab CRM Makefile
SHELL := /bin/bash

.PHONY: start stop restart dev test clean setup docs

start:
	@echo "Starting KovaaLab CRM..."
	@docker-compose up -d postgres redis
	@sleep 10
	@docker-compose up -d api web

stop:
	@echo "Stopping KovaaLab CRM..."
	@docker-compose down

restart:
	@make stop
	@make start

dev:
	@echo "Starting development..."
	@cd packages/twenty-server && npm run dev

test:
	@echo "Running tests..."
	@cd packages/twenty-server && npm run test

migrate:
	@echo "Running migrations..."
	@cd packages/twenty-server && npm run migrate

seed:
	@echo "Seeding database..."
	@cd packages/twenty-server && npm run seed

clean:
	@echo "Cleaning up..."
	@rm -rf packages/twenty-server/dist
	@docker-compose down -v --remove-all-networks

setup:
	@echo "Setting up KovaaLab CRM..."
	@cp .env.example .env
	@npm install
	@make migrate
	@make seed
	@echo "Setup complete! Start with: make start"
