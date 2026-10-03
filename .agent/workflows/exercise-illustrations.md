# Exercise illustrations

**Current update — 2026-10-02:** All 114 built-in exercises have reviewed illustrations and packaged offline assets in the current manifest. This guide remains the maintenance procedure and retains the original production references below. Verify the manifest and registry when seeds or artwork change.

## Purpose and current scope

Create an original, consistent library of exercise stills for the About tab. The owner approved model v1 and requested expansion to all 114 built-in exercises on 2026-09-30. Preserve the three pilot assets and use the same reference for the full library. Custom exercises retain their own image or fallback. Track actual coverage in `assets/exercises/library-manifest.json`; only independently reviewed artwork is packaged.

## Fixed reference

- Master: `assets/exercises/barbell-curl.png`, the original generated model-v1 image.
- Original pilot prompts: `assets/exercises/generation-spec.json`. Per-exercise production prompts, output hashes and reviews: `assets/exercises/records/<id>.json`.
- Use the master image as the identity/style input for **every** new exercise. Referencing the latest generated exercise instead causes gradual drift.
- Preserve the master. A deliberate new character or art direction gets a new version and a new reference; do not silently replace it.
- The model is a normally athletic grey adult mannequin, with short charcoal shorts and charcoal shoes. Keep its head, body proportions, material, clothing, and equipment design consistent.
- Use a square canvas, light cool-grey background, soft upper-left studio light, and near-orthographic perspective. Choose a view that makes the exercise mechanics legible. Keep the complete figure and equipment inside the frame.
- Coral marks visible primary muscle regions. It is a schematic cue, not measured activation or a complete list of working muscles. Do not highlight bones, joints, secondary muscles, or muscles hidden by clothing. The squat therefore shows quads; its glutes remain covered by shorts.

## Repeatable production loop

1. Read the actual seed ID, equipment, and primary muscles in `src/data/exercises.ts`. Specify the variant and representative position before generating (for example, high-bar back squat near parallel).
2. Write a small pose brief: hand orientation and width, elbow/wrist alignment, spinal posture, stance, contact points, equipment geometry, camera, and visible primary highlights. Use relevant technique references when these are uncertain.
3. Copy the invariant block from an existing prompt in `generation-spec.json`; replace only the exercise-specific block. Pass the master PNG as a reference to the built-in image generator. Generate one asset per call. The original pilot was created with built-in `image_gen`, without an API script or third-party artwork reference.
4. Inspect the full-resolution output and compare it with the master. Have a separate reviewer check the pose and equipment. A plausible-looking image can still have the wrong grip or bar location.
5. If a defect is visible, request one targeted edit, keeping the identity, clothing, lighting and other correct features fixed. Reinspect the result. Save the correction prompt with the generation record.
6. Copy the candidate into `assets/exercises/<stable-exercise-id>.png` and save its exact prompts, output hash/dimensions, pose, accessibility label and self-review in `assets/exercises/records/<id>.json`. Use review status `self-reviewed`. The independent reviewer inspects the actual image, records concrete findings, and changes status to `reviewed` only after material issues are resolved. Preserve rejected originals at their generator output paths.
7. Package reviewed records with the utility below. It preserves original PNGs and creates smaller JPEG copies without changing dimensions/composition. These broadly supported opaque assets keep the offline library size practical. The generated static `require` registry is `src/data/exerciseIllustrations.generated.ts`; lookup remains in `src/data/exerciseIllustrations.ts`. Never assign art to a different movement based on a loose name match.
8. Verify the About card on a mobile surface: image is large, uncropped, scrollable, and the pose reads at actual size. Check an exercise without artwork and exercise switching too. Run typecheck and the relevant artwork/details tests after code changes.

## Inventory, packaging and review gallery

`scripts/exercise-art.cjs` supports:

```text
node scripts/exercise-art.cjs inventory
node scripts/exercise-art.cjs package --sharp-dir <directory containing sharp>
node scripts/exercise-art.cjs verify --require-complete
node scripts/exercise-art.cjs gallery
```

The packaged dependency runtime can supply Sharp; use `load_workspace_dependencies` to locate its Node packages. If Sharp resolves normally, omit `--sharp-dir`. This utility does no image generation and makes no API calls. `package --require-complete` refuses to publish an incomplete registry. During production, packaging without that flag includes only already-reviewed assets. `verify --require-complete` checks every seed is covered, exact exercise mappings, source/output hashes, and registry consistency. The local `assets/exercises/review.html` gallery shows all exercises and links each available PNG at full size.

Generation workers own disjoint asset IDs and their records. Release ownership of completed batches to the integrating reviewer, and request ownership back before a correction. Do not write the shared registry/manifest from multiple workers.

## Visual acceptance checks

For every image:

- Correct exercise variant; plausible joints and limb lengths; coherent hands and feet.
- One continuous bar with consistent plates/collars; visible hands grip it; no floating equipment or penetration through the body.
- Realistic support/contact points. Avoid using a still to claim verified motion, tempo, bracing, or hidden anatomy.
- Matching identity, proportions, shorts, shoes, grey material, coral tone, lighting, and backdrop.
- The highlight follows the intended muscle region and does not spill onto joints.
- Full head, feet and equipment visible with useful padding; no irrelevant text, logos, arrows, or scenery.

Pilot pose checks:

| Exercise | Required visible details |
| --- | --- |
| Flat bench press, bottom | Level bench; supported head/upper back/buttocks; feet planted; closed overhand grip; shaft at lower sternum; forearms under bar; elbows moderately tucked; chest highlighted. |
| High-bar squat, near parallel | Bar behind neck on upper traps; closed overhand grips; hips and knees flexed; knees track toes; planted heels/forefeet; natural trunk inclination; quads highlighted above kneecaps. |
| Standing curl, mid-rep | Closed underhand grip; elbows beside torso; forearms near horizontal; straight wrists; upright trunk; stable feet; biceps highlighted. |

## Technique references

- [ACE bench press protocol](https://contentcdn.eacefitness.com/assets/certification/ace-answers/forms/pt/38_Bench-Press_Assessment_Protocol.pdf): support points, grip and bar placement.
- [NSCA Basics of Strength and Conditioning, pages 48–49](https://www.nsca.com/contentassets/48a12160221541acbdc048498d77192d/basics_of_strength_and_conditioning_manual.pdf): squat setup, high-bar placement and contact.
- [NSCA squat description](https://www.nsca.com/education/articles/kinetic-select/anaerobic-and-muscle-endurance-development/): near-parallel position.
- [Mayo Clinic barbell curl](https://www.mayoclinic.org/healthy-lifestyle/fitness/multimedia/biceps-curl/vid-20084678): supinated grip, wrist and elbow position.

These sources informed pose checks; their artwork was not used as an image-generation input. This process uses image-reference conditioning, not a reusable 3D rig. It improves consistency but requires visual review of each new output.
