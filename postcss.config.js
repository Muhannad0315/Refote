// On Replit the optional `caniuse-lite` update can sometimes be missing
// which causes `autoprefixer` to throw during pre-transform. Autoprefixer
// is useful but not strictly required for local Replit development; Tailwind
// will still work without vendor prefixing in most cases. Keep the config
// minimal to avoid platform-specific tooling errors.
export default {
  plugins: {
    tailwindcss: {},
  },
};
