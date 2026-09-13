.PHONY: help serve check clean-cache

PYTHON ?= python3
PORT ?= 4173

help:
	@echo "make serve       Start a local static server on port $(PORT)"
	@echo "make check       Run dependency-free source checks"
	@echo "make clean-cache Preview generated cache cleanup"
	@echo "make clean-cache CLEAN=1  Remove only .cache and coverage"

serve:
	$(PYTHON) -m http.server $(PORT)

check:
	@test -f index.html
	@test -f css/style.css
	@test -f js/main.js
	@if command -v node >/dev/null 2>&1; then node --check js/main.js; else echo "node unavailable; skipped JavaScript syntax check"; fi

clean-cache:
	@if [ "$(CLEAN)" = "1" ]; then \
		rm -rf -- ./.cache ./coverage; \
		echo "Removed .cache and coverage when present."; \
	else \
		echo "Dry run: would remove ./.cache and ./coverage only."; \
	fi
