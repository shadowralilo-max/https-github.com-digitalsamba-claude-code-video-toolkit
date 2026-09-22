// One-off helper: `npm run wallet` — sets up / inspects the AgentPump
// Solana wallet outside of the trading loop. Run this first.
import { agentPump } from "./mcpClient.js";
import { pickNumber } from "./utils.js";

async function main() {
  let address;
  try {
    const res = await agentPump.address();
    address = typeof res === "string" ? res : pickNumber(res, []) ?? res?.address;
  } catch {
    address = null;
  }

  if (!address) {
    console.log("No wallet found yet — creating one...");
    const created = await agentPump.createWallet();
    console.log(created);
    console.log(
      "\nWallet created. Fund it with a SMALL amount of SOL (this bot is designed\n" +
        "to risk only a few dollars) before starting the trader with `npm start`."
    );
    return;
  }

  const balance = await agentPump.balance();
  console.log("Wallet address:", address);
  console.log("Balance:", balance);
  console.log(
    "\nSend SOL to the address above to fund the bot, then run `npm start`.\n" +
      "To move funds back out at any time: node src/wallet.js withdraw <address> [amount]"
  );

  const [, , cmd, to, amountStr] = process.argv;
  if (cmd === "withdraw") {
    if (!to) {
      console.error("Usage: node src/wallet.js withdraw <destination-address> [sol-amount]");
      process.exitCode = 1;
      return;
    }
    const amount = amountStr ? Number(amountStr) : undefined;
    const result = await agentPump.withdraw(to, amount);
    console.log("Withdraw result:", result);
  } else if (cmd === "export-key") {
    console.log(
      "\nWARNING: anyone with this private key can spend all funds in the wallet.\n" +
        "Only proceed if you are the wallet owner and understand the risk.\n"
    );
    const key = await agentPump.exportKey();
    console.log(key);
  }
}

main().catch((err) => {
  console.error("Wallet command failed:", err);
  process.exitCode = 1;
});
