import { disableTypes } from "image-size";

// image-size 2.0.2 has no fixed release for these container parsers.
// Restrict build-time metadata extraction; uploads use our separate PNG validator.
// HEIF also includes AVIF. Plain public assets are still served unchanged.
disableTypes(["icns", "jxl", "heif"]);
