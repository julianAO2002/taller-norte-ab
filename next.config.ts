import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  // Blocking metadata for every user agent: title and description are always
  // in the <head> of the first HTML response, never streamed in afterwards.
  htmlLimitedBots: /.*/,
  async redirects() {
    return [{ source: "/", destination: "/practica", permanent: false }];
  },
};

export default config;
