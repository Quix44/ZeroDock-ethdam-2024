# Specify the base image
FROM rust:latest as builder

# Set the working directory
WORKDIR /usr/src/app

# Copy your source files into the container
COPY . .

# Compile the Rust application
RUN cargo build --release

# Set the entrypoint to the compiled binary
ENTRYPOINT ["/usr/src/app/target/release/verify"]
