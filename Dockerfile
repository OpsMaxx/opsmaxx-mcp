# The relay, containerised.
#
# Read this before assuming the image is useful on its own: opsmaxx-mcp does
# not implement any tool. It forwards MCP messages to a running OpsMaxx
# desktop app over authenticated HTTP on loopback, and forwards the replies
# back. `tools/list` is answered by the app, not by this process.
#
# So a container with no reachable app exits 1 at startup, by design -- a
# relay that pretended to be up while its far end was missing would fail every
# call later, somewhere harder to read.
#
# To run it you must give it a session AND a route to the host's app:
#
#   docker run --rm -i \
#     -e OPSMAXX_MCP_TOKEN=... \
#     -e OPSMAXX_MCP_URL=http://host.docker.internal:5177/mcp \
#     --add-host host.docker.internal:host-gateway \
#     opsmaxx-mcp
#
# The app binds 127.0.0.1, so the container needs an explicit route to the
# host; there is no configuration of this image alone that substitutes for a
# running OpsMaxx.

FROM node:22-alpine

WORKDIR /app

# Dependencies first, from the lockfile, so the layer caches independently of
# source edits. --omit=dev because the only runtime dependency is the MCP SDK.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# Not root: this process needs no privilege beyond an outbound HTTP request.
USER node

ENTRYPOINT ["node", "src/index.js"]
