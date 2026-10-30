use bridge::export;
use serde::{Deserialize, Serialize};

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi, into_wasm_abi))]
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportSizeOptions {
    pub width: u32,
    pub height: u32,
    pub resolution: u32,
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi, into_wasm_abi))]
#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub struct ExportSize {
    pub width: u32,
    pub height: u32,
}

#[export]
pub fn get_export_size(options: ExportSizeOptions) -> Option<ExportSize> {
    let ExportSizeOptions { width, height, resolution } = options;
    if width == 0 || height == 0 || ![480, 720, 1080, 1440].contains(&resolution) {
        return None;
    }
    let scale = f64::from(resolution) / f64::from(width.min(height));
    let even = |value: u32| ((f64::from(value) * scale / 2.0).round() as u32).max(1) * 2;
    let size = ExportSize { width: even(width), height: even(height) };
    // Avoid unreasonable encoder allocations for malformed/extreme aspect ratios.
    (size.width <= 16_384 && size.height <= 16_384).then_some(size)
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi, into_wasm_abi))]
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransitionOptions {
    pub previous_start: f64,
    pub previous_duration: f64,
    pub start: f64,
    pub duration: f64,
    pub requested_duration: f64,
    pub time: f64,
    pub frame_duration: f64,
    #[serde(default)]
    pub moving: bool,
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi, into_wasm_abi))]
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TransitionState {
    pub duration: f64,
    pub progress: f64,
    pub active: bool,
    pub from_time: f64,
}

/// A transition occupies the beginning of the incoming clip. It uses the last
/// visible outgoing frame, so trimmed footage is never exposed and neither the
/// project duration nor its audio timing changes.
#[export]
pub fn get_transition_state(options: TransitionOptions) -> TransitionState {
    let TransitionOptions { previous_start, previous_duration, start, duration,
        requested_duration, time, frame_duration, moving } = options;
    let values = [previous_start, previous_duration, start, duration, requested_duration, time, frame_duration];
    let valid = values.iter().all(|value| value.is_finite())
        && previous_start >= 0.0 && previous_duration > 0.0 && start >= 0.0
        && duration > 0.0 && requested_duration > 0.0 && frame_duration > 0.0
        && (previous_start + previous_duration - start).abs() <= 1.0;
    let transition_duration = if valid {
        requested_duration.min(previous_duration / 2.0).min(duration / 2.0)
    } else { 0.0 };
    let elapsed = time - start;
    TransitionState {
        duration: transition_duration,
        progress: if transition_duration > 0.0 {
            (elapsed / transition_duration).clamp(0.0, 1.0)
        } else { 1.0 },
        active: transition_duration > 0.0 && elapsed >= 0.0 && elapsed < transition_duration,
        from_time: if moving && transition_duration > 0.0 {
            (start - transition_duration + elapsed.clamp(0.0, transition_duration))
                .min(start - frame_duration.min(previous_duration)).max(previous_start)
        } else {
            (start - frame_duration.min(previous_duration)).max(previous_start)
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn export_sizes_preserve_orientation_and_even_dimensions() {
        for (resolution, width) in [(480, 854), (720, 1280), (1080, 1920), (1440, 2560)] {
            assert_eq!(get_export_size(ExportSizeOptions { width: 1920, height: 1080, resolution }), Some(ExportSize { width, height: resolution }));
            assert_eq!(get_export_size(ExportSizeOptions { width: 1080, height: 1920, resolution }), Some(ExportSize { width: resolution, height: width }));
        }
        assert_eq!(get_export_size(ExportSizeOptions { width: 1000, height: 1000, resolution: 720 }), Some(ExportSize { width: 720, height: 720 }));
        assert_eq!(get_export_size(ExportSizeOptions { width: 0, height: 1080, resolution: 720 }), None);
        assert_eq!(get_export_size(ExportSizeOptions { width: 1920, height: 1080, resolution: 999 }), None);
    }
    fn transition(time: f64) -> TransitionOptions {
        TransitionOptions { previous_start: 0.0, previous_duration: 240000.0, start: 240000.0,
            duration: 240000.0, requested_duration: 60000.0, time, frame_duration: 4000.0, moving: false }
    }
    #[test]
    fn transition_boundaries_do_not_extend_the_timeline() {
        assert!(!get_transition_state(transition(239999.0)).active);
        assert_eq!(get_transition_state(transition(240000.0)).progress, 0.0);
        let halfway = get_transition_state(transition(270000.0));
        assert!(halfway.active);
        assert_eq!(halfway.progress, 0.5);
        assert_eq!(halfway.from_time, 236000.0);
        assert!(!get_transition_state(transition(300000.0)).active);
    }
    #[test]
    fn transitions_reject_gaps_invalid_values_and_limit_short_clips() {
        let mut options = transition(240000.0);
        options.previous_duration = 10000.0;
        options.previous_start = 230000.0;
        assert_eq!(get_transition_state(options).duration, 5000.0);
        let mut options = transition(240000.0);
        options.start += 4000.0;
        assert_eq!(get_transition_state(options).duration, 0.0);
        let mut options = transition(240000.0);
        options.requested_duration = f64::NAN;
        assert!(!get_transition_state(options).active);
    }

    #[test]
    fn moving_transition_reads_the_outgoing_tail_without_exposing_trimmed_footage() {
        let mut options = transition(270000.0);
        options.moving = true;
        let state = get_transition_state(options);
        assert_eq!(state.from_time, 210000.0);
        assert_eq!(state.progress, 0.5);
        let mut options = transition(299999.0);
        options.moving = true;
        assert_eq!(get_transition_state(options).from_time, 236000.0);
    }
}
