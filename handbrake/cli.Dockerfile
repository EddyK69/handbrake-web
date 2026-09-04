ARG DISTROLESS_VARIANT=debug-nonroot
ARG HANDBRAKE_BUILD_TAG=1.11.2

FROM localhost:5000/handbrake-build:${HANDBRAKE_BUILD_TAG} AS handbrake-build

# Final image --------------------------------------------------------------------------------------
FROM gcr.io/distroless/base-debian13:${DISTROLESS_VARIANT} AS main

COPY --from=handbrake-build /rootfs/base/ /
COPY --from=handbrake-build /rootfs/extra/ /

ENTRYPOINT [ "/usr/local/bin/HandBrakeCLI" ]