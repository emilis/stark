.PHONY = default

### Variables ------------------------------------------------------------------

PUBLISH = 			git push && npm publish

### Tasks ----------------------------------------------------------------------

default:\

	echo "Nothing yet."


.PHONY += publish
publish:\

	$(PUBLISH)


.PHONY += publish-patch
publish-patch:\

	npm version patch && $(PUBLISH)
