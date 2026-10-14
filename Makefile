.PHONY: build check test contrast dist-check sync-test clean release-notes

# Regenerate dist/ from tokens/instrument.tokens.json.
build:
	node scripts/build.mjs

# Everything CI runs.
check: dist-check test contrast sync-test

dist-check:
	node scripts/build.mjs --check

test:
	node scripts/test.mjs

contrast:
	node scripts/contrast.mjs

# Exercise sync-instrument.sh against the local dist/.
sync-test:
	@tmp=$$(mktemp -d); \
	INSTRUMENT_LOCAL_DIST=$(CURDIR)/dist scripts/sync-instrument.sh $$(cat dist/VERSION) $$tmp/all web swift android echarts flat >/dev/null && \
	scripts/sync-instrument.sh --check $$tmp/all && \
	echo x >> $$tmp/all/web/instrument.css && ! scripts/sync-instrument.sh --check $$tmp/all >/dev/null 2>&1 && \
	echo "sync-instrument.sh: OK"; status=$$?; rm -rf $$tmp; exit $$status

clean:
	rm -rf dist
