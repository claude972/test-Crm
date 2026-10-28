release_tag_pattern='^v[0-9]+\.[0-9]+\.[0-9]+$'
if [[ -n "$VERSION" && ! "$VERSION" =~ $release_tag_pattern ]]; then
  echo "Error: VERSION must be a full release tag such as v2.38.1, omit it to install the latest release."
  exit 1
fi

pull_version=${VERSION:-$(curl -fsS --retry 3 --retry-delay 2 "https://hub.docker.com/v2/repositories/kovaa-labcrm/kovaa-lab/tags?page_size=100" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | grep -E "$release_tag_pattern" | sort -V | tail -n1)}

if [[ -z "$pull_version" ]]; then
  echo "Error: Unable to fetch the latest version tag. Please check your network connection or the Docker Hub API response."
  exit 1
fi
pull_branch=${BRANCH:-kovaa-lab/$pull_version}

install_url="https://raw.githubusercontent.com/kovaa-lab/kovaa-lab/$pull_branch/packages/kovaa-lab-docker/scripts/install.sh"

if ! curl -fsSL --retry 3 --retry-delay 2 -o kovaa-lab_install.sh.tmp "$install_url"; then
  rm -f kovaa-lab_install.sh.tmp
  echo "Error: Failed to download the install script from $install_url"
  echo "If this is a 404, the kovaa-lab/<version> ref does not exist: releases that predate the kovaa-lab/ tag namespace (v2.9.0 and older) are not supported."
  echo "Anything else is usually GitHub rate limiting your network, in which case retrying in a minute will work."
  exit 1
fi
mv kovaa-lab_install.sh.tmp kovaa-lab_install.sh

chmod +x kovaa-lab_install.sh
VERSION="$pull_version" BRANCH="$pull_branch" ./kovaa-lab_install.sh
install_status=$?

rm kovaa-lab_install.sh
exit $install_status
