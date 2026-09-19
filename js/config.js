// Ponscat ($PCAT) site config.
// Everything below is placeholder until the token actually launches.
// Swap DATA_SOURCE to "live" and fill in the fields once you have a real pair.

window.PONSCAT_CONFIG = {
  // "mock" = deterministic-looking fake ticker/chart data (safe default, pre-launch).
  // "live" = fetch real data from Dexscreener's public pair endpoint.
  DATA_SOURCE: "mock",

  TOKEN: {
    name: "Ponscat",
    ticker: "PCAT",
    chain: "TBD",
    contractAddress: "", // fill in once deployed, e.g. "0xabc123..."
    totalSupply: "420,000,000,000",
  },

  // Used only when DATA_SOURCE = "live".
  // chain/pairAddress come from the Dexscreener URL: dexscreener.com/<chain>/<pairAddress>
  LIVE: {
    chain: "",
    pairAddress: "",
    endpoint(chain, pairAddress) {
      return `https://api.dexscreener.com/latest/dex/pairs/${chain}/${pairAddress}`;
    },
  },

  LINKS: {
    x: "",
    telegram: "",
    discord: "",
    dexscreener: "",
    buy: "",
  },

  COMMUNITY_NAME: "Crypto Seekers Nation",
};
