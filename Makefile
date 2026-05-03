.DEFAULT_GOAL := help

.PHONY: help install dev build inspect smoke manifest-fetch clean

help:           ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install:        ## Install dependencies (pnpm)
	pnpm install

dev:            ## Run the MCP server locally via tsx (stdio)
	pnpm dev

inspect:        ## Run the MCP server through the official inspector UI
	pnpm inspect

build:          ## Compile TypeScript to dist/
	pnpm build

smoke:          ## End-to-end smoke test: spawn the server and verify tools/list
	pnpm smoke

manifest-fetch: ## Pull latest manifest from the live aurum-android gallery into data/manifest.json
	pnpm manifest:fetch

clean:          ## Remove build artefacts
	rm -rf dist node_modules/.cache .tsbuildinfo
