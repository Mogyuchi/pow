# syntax=docker/dockerfile:1.11.1@sha256:10c699f1b6c8bdc8f6b4ce8974855dd8542f1768c26eb240237b8f1c9c6c9976

# ベースとするイメージを定義
FROM ubuntu:devel@sha256:c62f1babc85f8756f395e6aabda682acd7c58a1b0c3bea250713cd0184a93efa AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# jqのバイナリを取得する => /jq
FROM ghcr.io/jqlang/jq:1.7@sha256:12f998e5a6f3f6916f744ba6f01549f156f624b42f7564e67ec6dd4733973146 AS fetch-jq

# pnpmを取得する => /pnpm/
FROM quay.io/curl/curl-base:8.11.0@sha256:7442b6cd429bbd7d579e75892b8a34f965d90031ce63b34da144101b7ed43ef5 AS fetch-pnpm
ENV SHELL="sh"
ENV ENV="/tmp/env"
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /dist
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,from=fetch-jq,source=/jq,target=/mounted-bin/jq \
    curl -fsSL --compressed https://get.pnpm.io/install.sh | env PNPM_VERSION=$(cat package.json  | /mounted-bin/jq -r .packageManager | grep -oE '[0-9]+\.[0-9]+\.[0-9]+') sh -

# .npmrcに設定を追記する => /_/.npmrc
FROM base AS change-npmrc
WORKDIR /_
COPY --link .npmrc ./
RUN echo "store-dir=/.pnpm-store" >> .npmrc

# Node.jsとdevDependenciesを取得する => /pnpm/,/.pnpm-store/,/_/node_modules/
FROM base AS fetch-deps
WORKDIR /_
COPY --link --from=fetch-pnpm /pnpm/ /pnpm/
ARG TARGETPLATFORM
RUN --mount=type=cache,id=pnpm-$TARGETPLATFORM,target=/.pnpm-store/ \
    --mount=type=bind,from=change-npmrc,source=/_/.npmrc,target=.npmrc \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    pnpm fetch --dev

# devDependenciesをインストールする => /_/node_modules/
FROM base AS dev-deps
WORKDIR /_
COPY --link --from=fetch-deps /_/node_modules/ ./node_modules/
ARG BUILDPLATFORM
RUN --mount=type=cache,id=pnpm-$BUILDPLATFORM,target=/.pnpm-store/ \
    --mount=type=bind,from=fetch-deps,source=/pnpm/,target=/pnpm/ \
    --mount=type=bind,from=change-npmrc,source=/_/.npmrc,target=.npmrc \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=bind,source=.husky/install.mjs,target=.husky/install.mjs \
    pnpm install --frozen-lockfile --offline --dev

FROM base AS runner
WORKDIR /app
COPY --link prisma/ prisma/
COPY --link --from=fetch-deps /pnpm/ /pnpm/
COPY --link --from=dev-deps /_/node_modules/ ./node_modules/
COPY --link .npmrc package.json ./
ENTRYPOINT [ "pnpm", "--shell-emulator" ]
CMD [ "db:deploy" ]
