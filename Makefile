### Variables ------------------------------------------------------------------

PUBLISH = 			git push && npm publish

### Tasks ----------------------------------------------------------------------

.PHONY:	default publish publish-patch publish-docs

default:\

	echo "Nothing yet."


publish:\

	$(PUBLISH)


publish-patch:\

	npm version patch && $(PUBLISH)


publish-docs:\

	git fetch origin gh-pages
	rm -rf tmp/*
	cd tmp/ ;\
		stark build -s ../docs -d local-pages ;\
		git clone -b gh-pages git@github.com:emilis/stark.git gh-pages ;\
		rm -rf gh-pages/* ;\
		cp -R local-pages/* gh-pages/ ;\
		cd gh-pages ;\
		touch .nojekyll ;\
		git add . ;\
		git status ;\
		git commit -am 'Rebuilt site.' ;\
		git push origin gh-pages

