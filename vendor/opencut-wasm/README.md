# Community renderer build

Built from this repository's Rust sources with wasm-bindgen **0.2.116**, targeting the browser bundler. This extends OpenCut's MIT-licensed `opencut-wasm` 0.2.10 with export sizing, frozen and moving transition timing, grayscale and five color-look GPU effects.

Build and Rust unit test provenance: https://github.com/nexora-sudo/OpenCut/actions/runs/41044535592 (source commit `209a1c0d26bf21d8c11803296a97a342929ff1f9`). The downloaded artifact was verified against GitHub's SHA-256 digest `fb1f651726de7e040bd963bb15338ff48d3a8ab3a62d1ac9cbf3f27e70e4d4c4`. The included `opencut_wasm_bg.wasm` has SHA-256 `bdb8de9163c5b730f850756aa6d1a5edec34715bf7c6d97e69b59e22dd619da4`.

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
