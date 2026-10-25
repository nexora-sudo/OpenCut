# Community renderer build

Built from this repository's Rust sources with wasm-bindgen **0.2.116**, targeting the browser bundler. This extends OpenCut's MIT-licensed `opencut-wasm` 0.2.10 with export sizing, transition timing, and a grayscale GPU shader.

Build and Rust unit test provenance: https://github.com/nexora-sudo/OpenCut/actions/runs/40222520496 (source commit `1a7a188d`). The downloaded artifact was verified against GitHub's SHA-256 digest `cce8d55e3171e1a08c16b737c7ce483378bf922beb70382f9010772c440e9539`.

The generated WASM and JavaScript are checked in so Vercel and local users do not need a Rust toolchain. Both workspace dependency declarations point here. Do not hand-edit generated bindings.

To rebuild on Linux/macOS with Rust installed:

```sh
rustup target add wasm32-unknown-unknown
cargo test -p time --locked
cargo build -p opencut-wasm --release --target wasm32-unknown-unknown --locked
# Install the matching official wasm-bindgen-cli 0.2.116, then:
wasm-bindgen target/wasm32-unknown-unknown/release/opencut_wasm.wasm --target bundler --out-dir vendor/opencut-wasm
```

The `Community WASM` workflow also creates the generated files as a downloadable artifact.
