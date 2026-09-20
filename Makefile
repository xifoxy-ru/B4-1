.PHONY: help serve check clean-cache

PYTHON ?= python3
NODE ?= node
PORT ?= 4173
ROOT_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

help:
	@echo "make serve       Start a local static server on port $(PORT)"
	@echo "make check       Run dependency-free source checks"
	@echo "make clean-cache Preview generated cache cleanup"
	@echo "make clean-cache CLEAN=1  Remove only .cache and coverage"

serve:
	cd "$(ROOT_DIR)" && $(PYTHON) -m http.server $(PORT)

check:
	@test -f "$(ROOT_DIR)index.html"
	@test -f "$(ROOT_DIR)css/style.css"
	@test -f "$(ROOT_DIR)js/main.js"
	@if command -v "$(NODE)" >/dev/null 2>&1; then \
		for file in "$(ROOT_DIR)"js/*.js; do "$(NODE)" --input-type=module --check < "$$file" || exit 1; done; \
	else echo "node is required for the JavaScript syntax check" >&2; exit 1; fi

clean-cache:
	@if [ "$(CLEAN)" = "1" ]; then \
		rm -rf -- "$(ROOT_DIR).cache" "$(ROOT_DIR)coverage"; \
		echo "Removed .cache and coverage when present."; \
	else \
		echo "Dry run: would remove $(ROOT_DIR).cache and $(ROOT_DIR)coverage only."; \
	fi
