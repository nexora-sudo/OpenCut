struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coord: vec2f,
}
struct EffectUniforms {
    resolution: vec2f,
    direction: vec2f,
    scalars: vec4f,
}
@group(0) @binding(0) var input_texture: texture_2d<f32>;
@group(0) @binding(1) var input_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let color = textureSample(input_texture, input_sampler, input.tex_coord);
    var adjusted = color.rgb;
    let mode = u32(uniforms.scalars.y);
    switch mode {
        case 0u: { // Sepia
            adjusted = vec3f(dot(color.rgb, vec3f(0.393, 0.769, 0.189)),
                dot(color.rgb, vec3f(0.349, 0.686, 0.168)),
                dot(color.rgb, vec3f(0.272, 0.534, 0.131)));
        }
        case 1u: { adjusted = color.rgb * vec3f(1.15, 1.02, 0.85); }
        case 2u: { adjusted = color.rgb * vec3f(0.85, 1.02, 1.15); }
        case 3u: {
            let luminance = dot(color.rgb, vec3f(0.2126, 0.7152, 0.0722));
            adjusted = (mix(vec3f(luminance), color.rgb, 1.5) - vec3f(0.5)) * 1.15 + vec3f(0.5);
        }
        default: { adjusted = vec3f(1.0) - color.rgb; }
    }
    return vec4f(mix(color.rgb, clamp(adjusted, vec3f(0.0), vec3f(1.0)), uniforms.scalars.x), color.a);
}
