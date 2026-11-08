# Keep in step with the exact apollo-ios version in Package.swift: generated
# code only compiles against the runtime of the CLI that produced it.
APOLLO_IOS_VERSION := 2.5.0
APOLLO_CLI_SHA256 := c0161b298112b6a00f992149d0d8e5d2aa6825b03ef72923dd1eb19972988e77
APOLLO_CLI_DIR := .build/apollo-ios-cli-$(APOLLO_IOS_VERSION)
APOLLO_CLI ?= $(APOLLO_CLI_DIR)/apollo-ios-cli
CONFIG := ./apollo-codegen-config.json
GENERATED_DIR := ./Sources/QuranRecitationApp/GraphQL/Generated

.PHONY: codegen codegen-check

$(APOLLO_CLI_DIR)/apollo-ios-cli:
	mkdir -p $(APOLLO_CLI_DIR)
	curl -fsSL -o $(APOLLO_CLI_DIR)/apollo-ios-cli.tar.gz \
	  https://github.com/apollographql/apollo-ios/releases/download/$(APOLLO_IOS_VERSION)/apollo-ios-cli.tar.gz
	echo "$(APOLLO_CLI_SHA256)  $(APOLLO_CLI_DIR)/apollo-ios-cli.tar.gz" | shasum -a 256 -c -
	tar -xzf $(APOLLO_CLI_DIR)/apollo-ios-cli.tar.gz -C $(APOLLO_CLI_DIR)

codegen: $(APOLLO_CLI)
	rm -rf $(GENERATED_DIR)
	$(APOLLO_CLI) generate --path $(CONFIG)

codegen-check:
	@$(MAKE) --no-print-directory codegen
	@git add --intent-to-add $(GENERATED_DIR)
	@git diff --exit-code $(GENERATED_DIR) || { \
	  echo ""; \
	  echo "GraphQL generated code is out of date."; \
	  echo "Run 'make -C apps/ios codegen' and commit the result."; \
	  exit 1; \
	}
