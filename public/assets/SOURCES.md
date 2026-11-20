# Presentation asset provenance

Source: the current Figma Slides deck, exported 10 November 2026 through the official Figma connector. All 30 visible image instances are bound to local files. Exact hashes, source image geometry, clipping ancestors and exported dimensions are in `source/asset-bindings.json`.

| Slide | File | Source image node | Export node | Export pixels |
| --- | --- | --- | --- | --- |
| 2 | slide-02-9-10.png | `9:10` | `3:11` | 1920×1080 |
| 4 | slide-04-10-34.png | `10:34` | `10:34` | 1527×1074 |
| 5 | slide-05-27-43.png | `27:43` | `27:43` | 937×818 |
| 6 | slide-06-27-44.png | `27:44` | `27:44` | 1236×824 |
| 13 | slide-13-27-53.png | `27:53` | `27:53` | 824×824 |
| 14 | slide-14-27-63.png | `27:63` | `27:63` | 194×194 |
| 14 | slide-14-27-70.png | `27:70` | `27:70` | 194×194 |
| 14 | slide-14-27-89.png | `27:89` | `27:89` | 194×194 |
| 14 | slide-14-27-91.png | `27:91` | `27:91` | 194×194 |
| 14 | slide-14-27-66.png | `27:66` | `27:66` | 194×194 |
| 14 | slide-14-27-75.png | `27:75` | `27:75` | 194×194 |
| 14 | slide-14-27-77.png | `27:77` | `27:77` | 194×194 |
| 14 | slide-14-27-79.png | `27:79` | `27:79` | 194×194 |
| 14 | slide-14-27-81.png | `27:81` | `27:81` | 194×194 |
| 14 | slide-14-27-83.png | `27:83` | `27:83` | 194×194 |
| 15 | slide-12-notes-redacted.png (agency names blurred; unredacted export removed) | `28:109` | `28:109` | 1916×868 |
| 17 | slide-17-28-114.png (one agency name blurred) | `28:114` | `4:40` | 1920×1080 |
| 22 | slide-22-4-62.png | `4:62` | `4:62` | 1728×866 |
| 23 | slide-23-4-65.png | `4:65` | `4:65` | 1728×866 |
| 24 | slide-24-4-68.png | `4:68` | `4:68` | 1728×866 |
| 26 | slide-26-27-94.png | `27:94` | `27:94` | 1752×888 |
| 27 | slide-27-32-90.png | `32:90` | `32:89` | 1120×420 |
| 27 | slide-27-32-92.png | `32:92` | `32:91` | 1120×436 |
| 27 | slide-27-32-93.png | `32:93` | `32:93` | 518×900 |
| 29 | slide-29-spreadsheet.png | `32:6` | `32:6` | 864×540 |
| 29 | slide-29-inbox.png | `32:7` | `32:7` | 864×540 |
| 30 | slide-30-32-8.png | `32:8` | `32:8` | 1600×1000 |
| 31 | slide-31-32-95.png | `32:95` | `32:95` | 990×580 |
| 31 | slide-31-32-97.png | `32:97` | `32:96` | 674×900 |

Image-node exports preserve the visible fill crop. Where a parent clips the image, that parent viewport is exported instead: slides 2 and 17 have image-only slide viewports; slide 27 uses frames `32:89` and `32:91`; slide 31 uses frame `32:96` for the activity log. No slide containing separate audience text is flattened into a replacement image. The chrome frames are added by the presentation.

The Hawkeye screenshots show the user’s prototype with synthetic example data. The builder images retain their source caveats in visible captions and notes. No image content was generated. Two research screenshots have agency names blurred: `slide-12-notes-redacted.png` and `slide-17-28-114.png`. The other screenshots remain as the user placed them in Figma.

Portrait alt text intentionally does not guess people’s names. The exported files contain their original source pixels, which may include incidental UI text.
