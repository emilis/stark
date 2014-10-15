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
	rm -rf tmp/gh-pages
	git clone -b gh-pages . tmp/gh-pages
	cd tmp/gh-pages/ ;\
		git remote add github git@github.com:emilis/stark.git ;\
		git pull github gh-pages ;\
		git rm -rf . ;\
		stark build -s ../../docs/ -d ./ ;\
		touch .nojekyll ;\
		git add . ;\
		git status ;\
		git commit -am 'Rebuilt site.' ;\
		git push github gh-pages

