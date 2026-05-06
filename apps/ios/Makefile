APOLLO_CLI ?= apollo-ios-cli
CONFIG := ./apollo-codegen-config.json
GENERATED_DIR := ./Sources/QuranRecitationApp/GraphQL/Generated

.PHONY: codegen codegen-check

codegen:
	rm -rf $(GENERATED_DIR)
	$(APOLLO_CLI) generate --path $(CONFIG)

codegen-check:
	@$(MAKE) --no-print-directory codegen
	@git diff --exit-code $(GENERATED_DIR) || { \
	  echo ""; \
	  echo "GraphQL generated code is out of date."; \
	  echo "Run 'make -C apps/ios codegen' and commit the result."; \
	  exit 1; \
	}
