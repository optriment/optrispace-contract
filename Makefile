.DEFAULT_GOAL := help

NPM := npm
NPM_RUN := npm run
NPX := npx

help: # Show this help
	@egrep -h '\s#\s' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?# "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: # Setup project
	@${NPM} install
	@${NPX} husky install

compile: # Compile contracts
	@${NPM_RUN} compile

.PHONY: test
test: # Run tests
	@${NPM_RUN} test

.PHONY: test_with_gas
test_with_gas: # Run tests and calculate average price
	@REPORT_GAS=true ${NPM_RUN} test

lint: # Run linters
	@${NPM_RUN} lint

fix: # Run linters and try to fix issues
	@${NPM_RUN} fix

.PHONY: coverage
coverage: # Generate code coverage
	@${NPM_RUN} coverage

open_coverage:
	open ./coverage/index.html

run_node:
	@${NPX} hardhat node

clean: # Remove old artifacts
	@${NPX} hardhat clean
	@rm -rf ./cache
	@rm -rf ./coverage
